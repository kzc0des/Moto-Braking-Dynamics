/**
 * Plain-language definitions for engineering metrics, shown on demand by <app-info-tip>.
 * `plain` is the rider-facing summary; `detail` holds the formula and units behind "Read more",
 * matching the server physics (weight_transfer.py, brake.py, tire.py).
 */
export interface GlossaryEntry {
  title: string;
  symbol?: string;
  unit?: string;
  plain: string;
  detail: string;
}

export const METRIC_GLOSSARY = {
  wheelbase: {
    title: 'Wheelbase',
    symbol: 'L',
    unit: 'm',
    plain: 'The distance between the centres of the front and rear wheels. A longer bike tips forward less when you brake hard.',
    detail: 'Weight moved onto the front wheel while braking is ΔN = m·a·h / L, so a longer L shifts less load for the same deceleration. Presets range from 1.24 m (underbone) to 1.58 m (cruiser).'
  },
  cogHeight: {
    title: 'Centre of gravity height',
    symbol: 'h',
    unit: 'm',
    plain: 'How high the combined weight of bike and rider sits above the road. The higher it is, the more weight shifts onto the front wheel when you brake, and the sooner the rear wheel can lift.',
    detail: 'The rear wheel starts to lift (a stoppie) once deceleration reaches a = g × (horizontal distance from the centre of gravity to the front axle) / h. Presets range from 0.48 m (scooter, cruiser) to 0.66 m (adventure).'
  },
  totalMass: {
    title: 'Total mass',
    symbol: 'm',
    unit: 'kg',
    plain: 'The bike plus rider (about 70 kg) and fuel. The heavier the load, the more energy the brakes have to turn into heat.',
    detail: 'Kinetic energy E = ½·m·v². A 130 kg scooter at 60 km/h carries about 18 kJ, all of which the brakes and tyres must absorb to stop.'
  },
  tirePressure: {
    title: 'Cold tyre inflation pressure',
    unit: 'PSI',
    plain: 'Tyre air pressure measured cold, before riding. Too low and the tyre squirms and loses grip; too high and the contact patch shrinks, which also reduces grip.',
    detail: 'Grip is scaled against the OEM pressure p₀ (29 PSI front, 33 PSI rear; 2.0 / 2.3 bar): under-inflation costs 25 % × (1 − p/p₀)², over-inflation 35 % × (p/p₀ − 1)^1.5. 1 bar ≈ 14.5 PSI.'
  },
  rotorDiameter: {
    title: 'Rotor diameter',
    unit: 'mm',
    plain: 'The size of the brake disc. A bigger disc gives the caliper more leverage and more metal to soak up heat.',
    detail: 'Brake torque T = μ_pad · F_clamp · r_eff, where r_eff is the radius at the centre of the pads, slightly under half the diameter. Presets range from 220 mm (commuter) to 310 mm (supersport).'
  },
  padFriction: {
    title: 'Pad friction',
    symbol: 'μ',
    plain: 'How grippy the brake pads are against the disc when cool. Higher values give more stopping force for the same lever squeeze.',
    detail: 'Friction fades once the rotor passes its fade temperature: μ(T) = μ₀ · e^(−β·(T − T_fade)). Organic pads sit around 0.30–0.38, sintered pads around 0.40–0.50.'
  },
  fluidBoilTemp: {
    title: 'Brake fluid boiling point',
    unit: '°C',
    plain: 'The temperature at which brake fluid boils. Boiling creates vapour bubbles, so the lever goes soft and braking force drops.',
    detail: 'Above the boiling point, line pressure falls linearly to zero across the vapour transition band. Fresh DOT 3 boils at 205 °C or higher, DOT 4 at 230 °C or higher; absorbed water lowers both. Drum brakes have no fluid and are immune.'
  }
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof METRIC_GLOSSARY;
