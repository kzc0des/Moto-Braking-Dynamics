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
  }
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof METRIC_GLOSSARY;
