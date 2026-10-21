import time

class PhysicsEngine:
    def __init__(self):
        # Einstein coefficients
        self.B12 = 0.05  # Einstein coefficient for stimulated absorption
        self.B21 = 0.05  # Einstein coefficient for stimulated emission
        self.A21 = 0.01  # Einstein coefficient for spontaneous emission
        self.rho_nu = 0.0 # Intracavity radiation energy density
        
        self.N_total = 100000.0 # Total atom density
        self.N1 = 100000.0      # Ground state population
        self.N2 = 0.0           # Excited state population (metastable level)
        
        self.photons = 0.0      # Intracavity coherent photon count
        self.temperature = 0.0  # Normalized pump temperature (0.0 to 1.0)
        
        self.last_time = time.time()
        self.start_time = self.last_time
        
    def update(self, temperature_input, trigger_photon):
        current_time = time.time()
        dt = current_time - self.last_time
        if dt <= 0 or dt > 0.1: 
            dt = 0.016 # Stable timestep cap
        self.last_time = current_time
        
        self.temperature = float(max(0.0, min(1.0, temperature_input)))
        
        # Pumping rate W (scales with optical/thermal input)
        # In a 3-level laser medium, pump transfers N1 -> N3 -> fast decay to N2
        W = self.temperature * 3.5 
        
        # Trigger photon acts as an optical seed pulse to initiate laser avalanche
        if trigger_photon:
            self.photons += 10.0
            
        # Radiation density inside the cavity proportional to photon field
        self.rho_nu = self.photons * 0.005
        
        # Net stimulated emission rate: (B21*N2 - B12*N1) * rho
        stimulated_rate = (self.B21 * self.N2 - self.B12 * self.N1) * self.rho_nu
        spontaneous_rate = self.A21 * self.N2
        
        # Rate equations for Population Inversion:
        # dN2/dt = W*N1 - Stimulated Emission - Spontaneous Emission
        dN2_dt = (W * self.N1) - stimulated_rate - spontaneous_rate
        
        self.N2 += dN2_dt * dt
        self.N2 = max(0.0, min(self.N_total, self.N2))
        self.N1 = self.N_total - self.N2
        
        # Cavity photon dynamics:
        # Gain from stimulated emission + spontaneous seed - mirror transmission & scattering losses
        loss_rate = 0.8
        dphotons_dt = stimulated_rate + (0.1 * spontaneous_rate) - (loss_rate * self.photons)
        
        self.photons += dphotons_dt * dt
        self.photons = max(0.0, self.photons)
            
        return {
            'N1': float(self.N1),
            'N2': float(self.N2),
            'N_total': float(self.N_total),
            'rho_nu': float(self.rho_nu),
            'dN2_dt': float(dN2_dt),
            'photons': float(self.photons),
            'time_ms': (current_time - self.start_time) * 1000.0,
            'temperature': self.temperature,
            'population_inverted': bool(self.N2 > self.N1)
        }
