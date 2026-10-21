import cv2
import mediapipe as mp
import asyncio
import websockets
import json
import threading
import time
import math
import os
from physics import PhysicsEngine

# Global shared state
state = {
    'gesture': 'none',
    'explode_ratio': 0.0,
    'temperature': 0.0,
    'trigger_photon': False,
    'blast': False,
    'zoomed_in': False,
    'physics_data': {}
}

physics = PhysicsEngine()

# Connected WebSocket clients
connected_clients = set()

def get_distance(p1, p2):
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

def get_2d_distance(p1, p2):
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)

def process_vision():
    global state
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        max_num_hands=2,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.7
    )
    mp_draw = mp.solutions.drawing_utils
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[Vision] Warning: Camera (index 0) could not be opened. Running in headless / simulation-only mode.")
        while True:
            # Keep physics updating in background
            state['physics_data'] = physics.update(state['temperature'], state['trigger_photon'])
            state['trigger_photon'] = False
            time.sleep(0.033)
            
    # State tracking variables
    initial_hands_dist = -1
    tap_start_time = 0
    tap_cooldown = 0
    trigger_cooldown = 0
    
    print("[Vision] Camera initialized. Press ESC on OpenCV window to close.")
    
    while cap.isOpened():
        success, image = cap.read()
        if not success:
            time.sleep(0.03)
            continue
            
        image = cv2.flip(image, 1)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb_image)
        
        current_gesture = 'none'
        trigger = False
        blast = False
        temp_input = state['temperature']
        explode = state['explode_ratio']
        
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_draw.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            num_hands = len(results.multi_hand_landmarks)
            
            # --- 2 HAND GESTURES ---
            if num_hands == 2:
                h1 = results.multi_hand_landmarks[0]
                h2 = results.multi_hand_landmarks[1]
                
                # Check pinch on both hands (index tip 8 to thumb tip 4)
                pinch1 = get_distance(h1.landmark[4], h1.landmark[8]) < 0.06
                pinch2 = get_distance(h2.landmark[4], h2.landmark[8]) < 0.06
                
                dist = get_distance(h1.landmark[0], h2.landmark[0])
                
                if pinch1 and pinch2:
                    current_gesture = 'explode'
                    if initial_hands_dist < 0:
                        initial_hands_dist = dist
                    else:
                        # calculate explode ratio (pull apart)
                        ratio = (dist - initial_hands_dist) * 3.5
                        explode = max(0.0, min(1.0, ratio))
                else:
                    initial_hands_dist = -1
                    # If inside resonator, two open hands pulled apart acts as zoom out to gauntlet
                    if state['zoomed_in'] and dist > 0.6 and not pinch1 and not pinch2:
                        state['zoomed_in'] = False
                        current_gesture = 'zoom_out'
            
            # --- 1 HAND GESTURES ---
            elif num_hands == 1:
                hand = results.multi_hand_landmarks[0]
                pinch = get_distance(hand.landmark[4], hand.landmark[8]) < 0.06
                now = time.time()
                
                if not state['zoomed_in']:
                    # Air tap to zoom into Resonator
                    if pinch:
                        if tap_start_time == 0 and (now - tap_cooldown > 0.6):
                            tap_start_time = now
                    elif tap_start_time > 0:
                        tap_duration = now - tap_start_time
                        if 0.05 < tap_duration < 0.5: # Quick pinch-release
                            current_gesture = 'air_tap'
                            state['zoomed_in'] = True
                            tap_cooldown = now
                        tap_start_time = 0
                else:
                    # Inside Optical Resonator
                    
                    # 1. Palm Elevation -> Pump Temperature
                    palm_y = hand.landmark[0].y
                    # Adjust range: 0.15 (top of screen) to 0.85 (bottom)
                    temp_val = max(0.0, min(1.0, (0.85 - palm_y) / 0.7))
                    temp_input = temp_val
                    current_gesture = 'palm_elevate'
                    
                    # 2. Air Tap toggle zoom out if pinch is quick
                    # Or pinch triggers seed photons if held
                    if pinch:
                        if tap_start_time == 0 and (now - trigger_cooldown > 0.4):
                            tap_start_time = now
                            trigger = True # Trigger optical seed pulse
                            trigger_cooldown = now
                            current_gesture = 'trigger'
                    elif tap_start_time > 0:
                        tap_duration = now - tap_start_time
                        # A very rapid double tap returns to gauntlet
                        if tap_duration < 0.25 and (now - tap_cooldown > 1.2):
                            # Quick release
                            pass
                        tap_start_time = 0
                        
                    # 3. Thrust Gesture (Repulsor Blast)
                    # Measured by hand apparent size (wrist to middle MCP in 2D)
                    palm_size = get_2d_distance(hand.landmark[0], hand.landmark[9])
                    # If hand pushes close to lens, palm_size exceeds 0.28
                    if palm_size > 0.28:
                        blast = True
                        current_gesture = 'thrust'
        else:
            initial_hands_dist = -1
            tap_start_time = 0

        # Update physics
        phys_data = physics.update(temp_input, trigger)
        
        # Update global state
        state['gesture'] = current_gesture
        state['explode_ratio'] = explode
        state['temperature'] = temp_input
        state['trigger_photon'] = trigger
        state['blast'] = blast
        state['physics_data'] = phys_data
        
        # Overlay HUD on camera feed
        cv2.putText(image, f"Gesture: {current_gesture.upper()}", (15, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.putText(image, f"View: {'RESONATOR' if state['zoomed_in'] else 'GAUNTLET'}", (15, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.putText(image, f"Pump Temp: {temp_input:.2f}", (15, 115), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)
        cv2.imshow("Mark-VII Vision Engine (Press ESC to close)", image)
        
        if cv2.waitKey(5) & 0xFF == 27:
            break
            
    cap.release()
    cv2.destroyAllWindows()
    os._exit(0)

# Websocket server supporting multiple concurrent clients (compatible with all websockets versions)
async def ws_handler(websocket, *args):
    connected_clients.add(websocket)
    print(f"[WebSocket] Client connected. Total active: {len(connected_clients)}")
    try:
        while True:
            # Safe shallow copy of dict state for concurrent serialization
            snapshot = dict(state)
            if 'physics_data' in snapshot and isinstance(snapshot['physics_data'], dict):
                snapshot['physics_data'] = dict(snapshot['physics_data'])
            payload = json.dumps(snapshot)
            await websocket.send(payload)
            await asyncio.sleep(1/30) # 30 FPS sync
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"[WebSocket] Client disconnected. Total active: {len(connected_clients)}")

async def start_server():
    print("[WebSocket] Starting server on ws://localhost:8765...")
    async with websockets.serve(ws_handler, "localhost", 8765):
        await asyncio.Future()

def main():
    t = threading.Thread(target=process_vision, daemon=True)
    t.start()
    asyncio.run(start_server())

if __name__ == "__main__":
    main()
