(function (host) {
    'use strict';
    const guides = {
    "tool-ohms-law-wheel": {
        "steps": [
            "Select Reset to start a new calculation.",
            "Enter two independent positive values among voltage (V), current (A), resistance (ohms) and power (W).",
            "Read the other two calculated fields. Change a known value to update the result; reset before switching to a different pair of known quantities."
        ],
        "example": "12 V and 6 ohms give 2 A and 24 W.",
        "readout": "The four fields describe the same ideal resistive DC operating point, rather than separate inputs to combine arbitrarily.",
        "limit": "Use this for positive DC resistive quantities. Reactive AC loads and nonlinear devices need a different model."
    },
    "tool-resistor-divider": {
        "steps": [
            "Enter the input voltage and upper/lower resistor values in ohms.",
            "Enter the resistance connected across the output; use 0 for the tool’s open-circuit setting.",
            "Compare output voltage, source current and resistor dissipation. Change the load to see how it pulls the output down."
        ],
        "example": "With 12 V, R1 = R2 = 10000 ohms and no load, the output is 6 V. A 10000-ohm load reduces it to 4 V.",
        "readout": "The lower divider leg includes the load in parallel. The two dissipation values belong to R1 and R2 individually.",
        "limit": "Nominal DC values only; tolerance, loading transients and resistor derating are outside this calculation."
    },
    "tool-e-series-finder": {
        "steps": [
            "Enter a positive target nominal value.",
            "Use one consistent unit, such as ohms or kilohms; the output stays in that unit.",
            "Compare the nearest E12, E24 and E96 values, then choose a real part with suitable ratings."
        ],
        "example": "Enter 4850 ohms to compare the closest preferred values around 4.85 kilohms.",
        "readout": "Each series result is the nearest table value by absolute difference, including values in adjacent decades.",
        "limit": "Preferred-value membership does not establish a part’s tolerance, availability or electrical ratings."
    },
    "tool-smd-resistor": {
        "steps": [
            "Type the printed resistor marking without units.",
            "Use a supported 3-digit, 4-digit, decimal-R or EIA-96 code.",
            "Read the nominal resistance and code format; if the code is rejected, check the original marking and manufacturer’s coding system."
        ],
        "example": "103 means 10000 ohms; 4R7 means 4.7 ohms.",
        "readout": "The resistance is decoded from the marking. The tolerance field deliberately refers you to the datasheet.",
        "limit": "Vendor-specific or ambiguous markings cannot reliably identify a component from this decoder alone."
    },
    "tool-led-resistor": {
        "steps": [
            "Enter supply voltage and the forward voltage of one LED at the intended current.",
            "Enter target current in mA and the integer number of LEDs in series.",
            "Read the calculated resistor, the next E12 value at or above it, and resistor dissipation. Check that the supply exceeds the total LED forward voltage."
        ],
        "example": "5 V, one 2 V LED and 20 mA require 150 ohms and dissipate 0.06 W in the ideal resistor.",
        "readout": "The E12 choice rounds upward. The displayed example wattage margin is arithmetic, not a temperature-qualified part selection.",
        "limit": "Forward voltage is treated as constant; check LED current limits and actual resistor derating separately."
    },
    "tool-reactance-calc": {
        "steps": [
            "Enter frequency and select its Hz/kHz/MHz/GHz unit.",
            "Enter capacitance and inductance with their corresponding unit selectors.",
            "Read capacitive reactance, inductive reactance and the ideal LC resonant frequency; vary frequency to compare the two reactances."
        ],
        "example": "At 1 kHz, 1 microfarad has about 159.15 ohms capacitive reactance and 1 millihenry has about 6.283 ohms inductive reactance.",
        "readout": "The displayed reactances are magnitudes. The resonance value is where the ideal inductive and capacitive magnitudes are equal.",
        "limit": "Ideal L and C only; ESR, package inductance and frequency-dependent component behavior are omitted."
    },
    "tool-rc-time-calc": {
        "steps": [
            "Enter resistance and capacitance, checking both unit selectors.",
            "Set the target voltage percentage: charging is relative to the final voltage; discharging is the fraction remaining.",
            "Read the time constant, charge/discharge times to that threshold and the ideal low-pass cutoff frequency."
        ],
        "example": "10 kilohms and 100 nF give a 1 ms time constant. Reaching 50% takes about 0.693 ms for either charge or discharge.",
        "readout": "Charge time and discharge time generally differ for the same percentage: 90% charged is not the same event as 90% remaining.",
        "limit": "An ideal first-order RC step, without source impedance changes, leakage or loading."
    },
    "tool-555-timer-calc": {
        "steps": [
            "Choose Astable for a repeating oscillator or Monostable for a triggered one-shot.",
            "Enter R1, R2 where relevant, and C1 using the displayed unit selectors.",
            "Read frequency, duty cycle and high/low times in Astable mode, or pulse duration in Monostable mode."
        ],
        "example": "For Astable mode, try R1 = 1 kilohm, R2 = 10 kilohms and C1 = 100 nF; then change R2 to see both timing and duty cycle move.",
        "readout": "The waveform illustrates the ideal timing. In Monostable mode, R1 and C determine the output’s high pulse after a trigger.",
        "limit": "Check the actual timer’s recommended R/C range, threshold errors, leakage and output/loading behavior."
    },
    "tool-current-sense-amp": {
        "steps": [
            "Enter maximum current in A and the ADC full-scale voltage in V.",
            "Set the allowed shunt drop in mV to calculate a shunt/gain pair.",
            "Alternatively edit Actual Shunt in milliohms or amplifier gain in V/V; the paired quantity updates. Read loss and ideal ADC resolution."
        ],
        "example": "10 A, 50 mV shunt drop and 3.3 V ADC full scale give a 5 milliohm shunt, gain 66 and 0.5 W shunt loss.",
        "readout": "The design targets full-scale ADC voltage at the entered maximum current. Resolution is ideal current per ADC count.",
        "limit": "Real amplifiers need output headroom and checks for offset, input common-mode range, bandwidth and overload."
    },
    "tool-unit-converter": {
        "steps": [
            "Choose a physical quantity category first.",
            "Select the From and To units within that category.",
            "Enter the source value and read the converted value; recheck unit selections when changing category."
        ],
        "example": "Choose Temperature and convert 25 degrees Celsius to 298.15 kelvin.",
        "readout": "Linear conversions use the chosen unit scale; logarithmic units use their stated power or voltage reference.",
        "limit": "This does not convert RF voltage into power through an assumed impedance. Use the dedicated RF translator for that."
    },
    "tool-friis-transmission": {
        "steps": [
            "Enter transmitter power in dBm and transmitter/receiver gains in dBi in the link direction.",
            "Enter positive frequency in MHz and separation in metres.",
            "Enter additional system loss in dB, then read free-space path loss and received power."
        ],
        "example": "At 1000 MHz and 100 m, 0 dBm transmit power, 0 dBi gains and 0 dB added loss give about 72.45 dB path loss and -72.45 dBm received power.",
        "readout": "Received power adds both antenna gains to transmit power, then subtracts free-space path loss and the entered extra loss.",
        "limit": "Far-field unobstructed free space with matched polarization; this is not an indoor, terrain or multipath coverage prediction."
    },
    "tool-ddr-reference": {
        "steps": [
            "Identify the DDR/LPDDR generation, controller, memory part, speed grade and topology for your design.",
            "Use Timing to distinguish clock cycles, transfer intervals and nanosecond limits.",
            "Use Routing to separate data/strobe groups, clock and command paths; then follow Bring-up and the linked device-specific guides."
        ],
        "example": "For 3200 MT/s, the clock period is 0.625 ns. CL22 corresponds to 13.75 ns of CAS latency.",
        "readout": "This is a reference sheet, not an automatic timing or PCB rule checker. The section links jump to the relevant tables and checklist.",
        "limit": "Do not reuse another controller’s impedance or matching limits as universal DDR rules."
    },
    "tool-ethernet-reference": {
        "steps": [
            "Start with Types to identify the exact BASE-T, single-pair or optical link family.",
            "Follow Connections from MAC to PHY to medium; check interface clocks, PHY straps, magnetics and connector drawings.",
            "Use Layout and the bring-up sequence alongside your PHY datasheet and its reference circuit."
        ],
        "example": "For 1000BASE-T, trace all four 8P8C pairs: 1-2, 3-6, 4-5 and 7-8.",
        "readout": "The tables distinguish MAC-side interfaces from the physical cable link. Nominal link rate is not application payload throughput.",
        "limit": "Conventional BASE-T, single-pair Ethernet, optical links and PoE require different connection and qualification details."
    },
    "tool-serdes-reference": {
        "steps": [
            "Identify the protocol, lane rate, modulation and both endpoints’ electrical requirements.",
            "Trace TX through packages, PCB, connectors and cable to the peer RX; check polarity, clocking and supported lane mapping.",
            "Use Timing & loss to assemble the channel budget, then the Routing checklist and vendor links for constraints and bring-up."
        ],
        "example": "A 10 Gb/s NRZ lane has a 100 ps unit interval; distinguish that from a PAM4 lane’s symbol interval.",
        "readout": "Use the sheet to organize the link’s timing, loss and topology questions. It does not calculate an eye diagram or BER.",
        "limit": "SerDes is not one universal impedance, coupling-capacitor value or layout standard; use the selected protocol and endpoint specifications."
    },
    "tool-lvds-reference": {
        "steps": [
            "Check the actual driver and receiver: supply, differential swing, common-mode limits and supported topology.",
            "Use Wiring to follow polarity and place the specified termination at the receiver; check whether termination is already integrated.",
            "Work through Checks for mapping, clock/data timing, failsafe behavior, layout and differential probing."
        ],
        "example": "For a point-to-point LVDS link, first check whether the receiver already contains its required termination before adding an external resistor.",
        "readout": "The drawing is a typical point-to-point connection; the checklist directs you to the conditions that must be verified for your devices.",
        "limit": "LVDS, M-LVDS, CML, LVPECL and CMOS are not interchangeable merely because a connector has a differential pair."
    },
    "tool-pv-yield-simulator": {
        "steps": [
            "Set DC nameplate, inverter AC limit, temperature coefficient, losses, efficiency and year.",
            "Select a location on the map or enter latitude and longitude; choose month, tilt, azimuth and cell temperature.",
            "Inspect the solar-time power and energy results; optionally search and apply model angles.",
            "For other evidence, import PVGIS JSON or supply interval CSV or monthly plane-of-array data in the advanced sections."
        ],
        "readout": "Local charts show a geometric clear-sky scenario; imported provider results and supplied-data calculations are separate.",
        "example": "Start with the displayed 1 kWp system and location, then vary tilt to compare scenarios.",
        "limit": "The local scenario omits real weather, shading and terrain; it is not expected site generation."
    },
    "tool-battery-suite": {
        "steps": [
            "Choose a battery reference or load an illustrative example.",
            "Enter capacity per cell or battery unit (Ah), effective DC resistance (ohms), cutoff (V), series/parallel counts and SOC. Complete the OCV and temperature curves; selecting a brand does not fill missing model data.",
            "Enter repeating schedule rows: seconds,current,A; seconds,power,W; or seconds,resistance,ohms. An optional fourth value is battery temperature in degrees Celsius. Set the horizon in hours and integration step in seconds.",
            "Select Calculate battery profile, then choose a plot channel or export the results."
        ],
        "readout": "Read runtime alongside the stopping reason and plot channels; a horizon-limited run is a lower bound.",
        "example": "Load the illustrative Li-ion example, or try a row of 60,current,0.1,25 for a constant 100 mA load at 25 degrees Celsius. Use only temperatures covered by your supplied curve.",
        "limit": "Discharge is a screening model and does not predict aging, self-heating, mismatch or protection behavior."
    },
    "tool-smps-loop-tuner": {
        "steps": [
            "Enter effective C in microfarads, ESR in milliohms, ESL in nH and capacitor quantity; set the frequency sweep. Optionally add a second parallel bank.",
            "Enter buck operating conditions and ripple and transient budgets for capacitor sizing.",
            "Set the loaded LC filter values to inspect gain and phase.",
            "For loop adjustment, paste increasing frequency in Hz, gain in dB and unwrapped phase in degrees, without a header. Adjust gain, zero and pole to compare with the measured sweep."
        ],
        "readout": "Compare impedance peaks and sizing budgets, filter peaking, and interpolated loop crossovers with the stated model assumptions.",
        "example": "Begin with the displayed capacitor bank and inspect its impedance sweep.",
        "limit": "The ideal models and hypothetical loop adjustment do not establish regulator stability; measure the actual loop."
    },
    "tool-pdn-impedance": {
        "steps": [
            "Enter the supply voltage in volts.",
            "Enter the dynamic droop budget as a percentage of supply voltage.",
            "Enter the actual load-current step in amperes and inspect the target."
        ],
        "readout": "Target impedance is the allocated dynamic voltage change divided by the current step.",
        "example": "At 1.2 V, 5% droop and a 2.5 A step, the target is 24 milliohms.",
        "limit": "This target does not predict board impedance or establish transient compliance."
    },
    "tool-magnetic-reluctance": {
        "steps": [
            "Enter effective core path length in mm and area in mm².",
            "Enter relative permeability and total air gap in mm.",
            "Enter turns and current in amperes, then inspect the calculated magnetic quantities."
        ],
        "readout": "Reluctance and inductance describe the linear circuit; flux density and stored energy use the entered current.",
        "example": "Try the displayed 50 mm path, 25 mm² area, 0.5 mm gap and 10 turns.",
        "limit": "Constant permeability excludes saturation, fringing and leakage; check the actual material at temperature."
    },
    "tool-battery-life-estimator": {
        "steps": [
            "Enter usable battery capacity in mAh.",
            "Enter active and sleep currents in mA.",
            "Enter active duty cycle as a percentage and read average current and runtime."
        ],
        "readout": "Runtime divides usable capacity by the duty-weighted average current.",
        "example": "With 2000 mAh, 100 mA active, 0.1 mA sleep and 10% duty, average current is 10.09 mA and runtime is about 198 hours.",
        "limit": "Capacity and currents must already account for load, temperature, cutoff and converter losses."
    },
    "tool-battery-pack-s-p-config": {
        "steps": [
            "Enter integer series and parallel cell counts.",
            "Enter nominal cell voltage, capacity in Ah and DC resistance in milliohms.",
            "Enter pack load current in amperes and inspect the pack outputs."
        ],
        "readout": "Voltage scales with series count, capacity with parallel count, and loss assumes equal current sharing.",
        "example": "For 4 series and 2 parallel 3.6 V, 3 Ah cells, nominal output is 14.4 V and 6 Ah.",
        "limit": "Nominal arithmetic excludes balancing, wiring and BMS losses and does not qualify the pack."
    },
    "tool-grid-power-calc": {
        "steps": [
            "Select single-phase or three-phase operation.",
            "Enter RMS voltage, RMS current and the existing lagging power factor; use line-to-line voltage for three phase.",
            "Enter target power factor and frequency to inspect correction capacitance."
        ],
        "readout": "Read real, reactive and apparent power and the reactive compensation; three-phase capacitance is per delta branch.",
        "example": "Try the displayed 230 V, 10 A, 0.85 power factor and 0.95 target in single-phase mode.",
        "limit": "The model assumes sinusoidal steady state and a balanced three-phase load; harmonics and resonance need separate analysis."
    },
    "tool-hydro-power-calc": {
        "steps": [
            "Enter net effective head in meters after hydraulic losses.",
            "Enter flow in cubic meters per second.",
            "Enter turbine and generator efficiencies as percentages and inspect power."
        ],
        "readout": "Theoretical power is reduced by turbine efficiency to mechanical power and then generator efficiency to electrical power.",
        "example": "At 100 m head, 50 m³/s flow, 90% turbine and 95% generator efficiency, electrical power is about 41.94 MW.",
        "limit": "This steady-flow estimate does not calculate penstock losses or seasonal energy yield."
    },
    "tool-ev-powertrain-calc": {
        "steps": [
            "Enter cruising speed in km/h, vehicle mass in kg, dimensionless rolling resistance and drag coefficients, and frontal area in square metres.",
            "Enter usable battery energy in kWh and drivetrain efficiency as a percentage.",
            "Inspect road forces, electrical power, consumption and estimated cruise range."
        ],
        "readout": "Range divides usable energy by modeled steady-speed consumption.",
        "example": "Use the displayed 100 km/h and 75 kWh case to compare the effect of changing speed.",
        "limit": "Flat-road steady cruise excludes hills, acceleration, wind, auxiliaries and aging."
    },
    "tool-smith-chart": {
        "steps": [
            "Enter real reference resistance, frequency and load resistance and reactance, or choose a preset or point on the chart.",
            "Select a series or shunt connection, component and value, then add elements from load toward source.",
            "Switch between impedance and admittance grids or clear the network; update the load when frequency changes."
        ],
        "readout": "Read input impedance, reflection coefficient, VSWR, return loss and the network table at each step.",
        "example": "Use the 50 Ω preset with a 50 Ω reference to inspect a matched load.",
        "limit": "Components are ideal lumped elements; a resistive match can dissipate power and L/C parasitics are excluded."
    },
    "tool-skin-depth": {
        "steps": [
            "Enter frequency in Hz, conductivity in MS/m and relative permeability.",
            "Enter round-wire diameter in mm and conductor length in meters.",
            "Inspect the skin depth and round-wire DC resistance."
        ],
        "readout": "Skin depth describes field penetration; the separately calculated resistance is DC resistance.",
        "example": "Try 1 MHz, 58 MS/m, relative permeability 1 and a 1 mm diameter wire.",
        "limit": "The model does not calculate AC resistance, ampacity or temperature rise."
    },
    "tool-rf-unit-translator": {
        "steps": [
            "Enter a value and choose its power or voltage unit.",
            "Enter the real load resistance in ohms or choose a preset.",
            "Read the equivalent power, voltage and current quantities."
        ],
        "readout": "Voltage is across the entered load; peak and peak-to-peak quantities assume a sine wave.",
        "example": "For 0 dBm into 50 Ω, power is 1 mW and voltage is about 0.2236 V RMS.",
        "limit": "This is a loaded-voltage conversion, not an open-circuit source or radiated-field calculation."
    },
    "tool-attenuator-calc": {
        "steps": [
            "Choose the Pi or Tee topology.",
            "Enter equal real source and load impedances, attenuation in dB and input power in watts.",
            "Inspect resistor values, output power and dissipation."
        ],
        "readout": "Input power is delivered to the matched pad; compare each calculated dissipation with a suitably derated component rating.",
        "example": "Start with the displayed 50 Ω input and output, 3 dB attenuation and 1 W input.",
        "limit": "The ideal equal-impedance network excludes tolerance, parasitics and frequency response."
    },
    "tool-rf-noise-figure": {
        "steps": [
            "Choose amplifier, lossy element or Not Used for each applicable stage.",
            "Enter stage gain in dB and amplifier noise figure in dB. For a lossy element, gain becomes negative and the tool sets its noise figure to the positive loss at 290 K.",
            "Read total cascade noise figure and gain; compare the effect of changing the first stage."
        ],
        "readout": "The Friis calculation weights downstream noise by preceding gain; passive loss uses its room-temperature noise figure.",
        "example": "Start with the displayed stages and compare the result after changing the first-stage gain.",
        "limit": "The calculation assumes matched linear same-frequency stages at a 290 K reference and excludes mixer conversion behavior."
    }
};

    function mount(container, toolId) {
        const guide = guides[toolId];
        if (!guide || !container) return;
        container.querySelector('.tool-usage')?.remove();
        const doc = container.ownerDocument;
        const section = doc.createElement('details');
        section.className = 'tool-usage';
        const summary = doc.createElement('summary');
        summary.textContent = 'How to use';
        section.appendChild(summary);
        const steps = doc.createElement('ol');
        for (const step of guide.steps) {
            const item = doc.createElement('li');
            item.textContent = step;
            steps.appendChild(item);
        }
        section.appendChild(steps);
        for (const [key, label] of [['example', 'Try it'], ['readout', 'Reading the results'], ['limit', 'Scope']]) {
            const paragraph = doc.createElement('p');
            const heading = doc.createElement('strong');
            heading.textContent = label + ': ';
            paragraph.appendChild(heading);
            paragraph.appendChild(doc.createTextNode(guide[key]));
            section.appendChild(paragraph);
        }
        container.prepend(section);
    }
    const api = { guides, mount };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else host.ToolsHelp = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
