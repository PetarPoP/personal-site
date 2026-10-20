// The CV's copy in English and Croatian. The PDF is laid out from this on every download
// (src/lib/cv/render.ts), with the key projects taken live from the ranked project list.

export type CvLang = 'en' | 'hr'

type Dated = { when: string; title: string; text: string }

export type CvCopy = {
  kicker: string
  location: string
  phones: string[]
  summary: string
  headings: { work: string; education: string; certificates: string; other: string; projects: string }
  work: Dated[]
  education: Dated[]
  certificates: Dated[]
  other: string[]
  footnote: string
}

const phones = ['+387 63 632 005', '+385 99 373 2936']

export const cv: Record<CvLang, CvCopy> = {
  en: {
    kicker: 'CURRICULUM VITAE',
    location: 'Livno / Split',
    phones,
    summary:
      'Fifth-year Computer Science student with hands-on experience in full-stack web development (Next.js) and embedded systems programming (C/C++, Python). Currently focused on bridging these two domains, from developing intuitive user interfaces to writing code for real-time hardware communication.',
    headings: { work: 'WORK EXPERIENCE', education: 'EDUCATION', certificates: 'CERTIFICATES', other: 'OTHER WORK', projects: 'KEY PROJECTS' },
    work: [
      {
        when: 'Sept. 2025 – Present',
        title: 'FESB Racing, FESB',
        text: 'Developing embedded software for the Vehicle Control Unit (VCU) of an electric formula student racing car. Implementing CAN bus communication and integrating real-time sensor systems on the STM32 platform.',
      },
      {
        when: 'Sept. 2023 – Sept. 2025',
        title: 'Software Developer, Kibernetika',
        text: 'Developing web applications for SCST using Next.js and React. Focused on performance optimization, server-side rendering (SSR), and intuitive UX.',
      },
      {
        when: 'Sept. 2024 – Feb. 2025',
        title: 'Demonstrator, University Department of Professional Studies',
        text: 'Mentoring students in Data Structures and Algorithms courses. Assisting with complex programming problems and debugging.',
      },
      {
        when: 'Jan. 2023 – Jan. 2024',
        title: 'Photographer, Foto Marin',
        text: 'Working in a dynamic environment requiring creative problem-solving, precision, and high-level client communication.',
      },
      {
        when: 'May 2021 – 2025',
        title: 'Sales Associate, Popović Jewelry',
        text: 'Direct sales and customer relationship management in a high-responsibility environment requiring developed negotiation skills.',
      },
    ],
    education: [
      { when: '2022 – Present', title: 'University Department of Professional Studies', text: 'Applied Computing' },
      { when: '2018 – 2022', title: 'Vocational Secondary School “Silvije Strahimir Kranjčević”', text: 'Computer Technician' },
    ],
    certificates: [
      { when: 'Mar. 2024 – May 2024', title: 'Digitalna Dalmacija – Junior DEV', text: 'React course, completed with highest marks' },
      { when: '2009 – 2017', title: 'English Language Course – B2', text: 'Achieved top grades' },
    ],
    other: ['Car wash attendant, NK', 'Pizza delivery driver, Mirakul'],
    footnote: 'Code and detailed project write-ups are on my GitHub profile.',
  },
  hr: {
    kicker: 'ŽIVOTOPIS',
    location: 'Livno / Split',
    phones,
    summary:
      'Student pete godine računarstva s praktičnim iskustvom u full-stack web razvoju (Next.js) i programiranju ugradbenih sustava (C/C++, Python). Trenutno se usmjeravam na povezivanje tih dvaju područja – od razvoja intuitivnih korisničkih sučelja do pisanja koda za komunikaciju s hardverom u stvarnom vremenu.',
    headings: { work: 'RADNO ISKUSTVO', education: 'OBRAZOVANJE', certificates: 'CERTIFIKATI', other: 'OSTALI POSLOVI', projects: 'KLJUČNI PROJEKTI' },
    work: [
      {
        when: '09/2025 – danas',
        title: 'FESB Racing, FESB',
        text: 'Razvoj ugradbenog softvera za upravljačku jedinicu vozila (VCU) električnog bolida Formula Student. Implementacija CAN komunikacije i integracija senzorskih sustava u stvarnom vremenu na platformi STM32.',
      },
      {
        when: '09/2023 – 09/2025',
        title: 'Programer, Kibernetika',
        text: 'Razvoj web aplikacija za SCST u Next.js-u i Reactu. Naglasak na optimizaciji performansi, renderiranju na strani poslužitelja (SSR) i intuitivnom korisničkom iskustvu.',
      },
      {
        when: '09/2024 – 02/2025',
        title: 'Demonstrator, Sveučilišni odjel za stručne studije',
        text: 'Mentoriranje studenata na kolegijima iz struktura podataka i algoritama. Pomoć pri rješavanju složenih programerskih zadataka i otklanjanju pogrešaka.',
      },
      {
        when: '01/2023 – 01/2024',
        title: 'Fotograf, Foto Marin',
        text: 'Rad u dinamičnom okruženju koje zahtijeva kreativno rješavanje problema, preciznost i visoku razinu komunikacije s klijentima.',
      },
      {
        when: '05/2021 – 2025',
        title: 'Prodavač, Zlatarna Popović',
        text: 'Izravna prodaja i upravljanje odnosima s kupcima u okruženju visoke odgovornosti koje zahtijeva razvijene pregovaračke vještine.',
      },
    ],
    education: [
      { when: '2022 – danas', title: 'Sveučilišni odjel za stručne studije', text: 'Primijenjeno računarstvo' },
      { when: '2018 – 2022', title: 'Srednja strukovna škola „Silvije Strahimir Kranjčević”', text: 'Tehničar za računalstvo' },
    ],
    certificates: [
      { when: '03/2024 – 05/2024', title: 'Digitalna Dalmacija – Junior DEV', text: 'Tečaj Reacta, završen s najvišim ocjenama' },
      { when: '2009 – 2017', title: 'Tečaj engleskog jezika – B2', text: 'Postignute najviše ocjene' },
    ],
    other: ['Djelatnik autopraonice, NK', 'Dostavljač pizza, Mirakul'],
    footnote: 'Kod i detaljni opisi projekata dostupni su na mom GitHub profilu.',
  },
}
