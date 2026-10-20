import type { Repo } from '#/lib/github'

// Stand-in GitHub data for local development without network access (GITHUB_MOCK=1 in .dev.vars).
// Byte counts are made up.
const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString()

export const mockRepos: Repo[] = [
  { name: 'personal-site', url: 'https://github.com/PetarPoP/personal-site', description: '', stars: 0, pushed: day(4), languages: { TypeScript: 89069, CSS: 5941, JavaScript: 2462 } },
  { name: 'midnight-crew-site', url: 'https://github.com/PetarPoP/midnight-crew-site', description: 'Website for Midnight Crew.', stars: 0, pushed: day(2), languages: { TypeScript: 41000, CSS: 3000 } },
  { name: 'IdeaPlanner', url: 'https://github.com/PetarPoP/IdeaPlanner', description: '', stars: 1, pushed: day(4), languages: { TypeScript: 120000, Rust: 9000 } },
  { name: 'esp32-obd', url: 'https://github.com/PetarPoP/esp32-obd', description: '', stars: 0, pushed: day(6), languages: { C: 60000, TypeScript: 22000 } },
  { name: 'fesb-racing-site', url: 'https://github.com/PetarPoP/fesb-racing-site', description: '', stars: 0, pushed: day(15), languages: { TypeScript: 70000 } },
  { name: 'zlatarna-popovic', url: 'https://github.com/PetarPoP/zlatarna-popovic', description: '', stars: 0, pushed: day(16), languages: { TypeScript: 52000, CSS: 2000 } },
  { name: 'FESB_racing', url: 'https://github.com/PetarPoP/FESB_racing', description: '', stars: 0, pushed: day(260), languages: { C: 30000 } },
  { name: 'graf_algoritmi', url: 'https://github.com/PetarPoP/graf_algoritmi', description: '', stars: 0, pushed: day(335), languages: { Python: 6000 } },
  { name: 'coffe-page', url: 'https://github.com/PetarPoP/coffe-page', description: '', stars: 0, pushed: day(340), languages: { JavaScript: 40000, CSS: 8000 } },
  { name: 'agiloProjekat', url: 'https://github.com/PetarPoP/agiloProjekat', description: '', stars: 0, pushed: day(850), languages: { 'C#': 15000 } },
  { name: 'SpaceAsteroids', url: 'https://github.com/PetarPoP/SpaceAsteroids', description: '', stars: 0, pushed: day(965), languages: { 'C#': 9000 } },
]

export const mockActivity = () => {
  const days: { date: string; count: number }[] = []
  for (let i = 370; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5)
    const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
    days.push({ date: d.toISOString().slice(0, 10), count: r < 0.35 ? 0 : Math.floor(r * r * 14) })
  }
  return { total: days.reduce((a, d) => a + d.count, 0), days }
}
