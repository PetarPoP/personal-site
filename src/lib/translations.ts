import type { Language } from "@/features/home/types";

export type Copy = {
  places: string;
  home: string;
  computer: string;
  trash: string;
  textFolder: string;
  imagesFolder: string;
  close: string;
  full: string;
  settings: string;
  textHub: string;
  theme: string;
  dark: string;
  light: string;
  language: string;
  english: string;
  croatian: string;
  folderEmpty: string;
  textFolderHint: string;
  preview: string;
  sendMail: string;
  mailSender: string;
  mailSubject: string;
  mailBody: string;
  newTextFile: string;
  emptyFiles: string;
  save: string;
  discard: string;
  unsavedPrompt: string;
  discardPrompt: string;
  createFileMenu: string;
  openMailerMenu: string;
  projectsFolder: string;
  projectsTitle: string;
  previewText: string;
  delete: string;
  emptyTrash: string;
  blockedDeleteBody: string;
  spotifyNoSong: string;
  spotifyGenericError: string;
  spotifyPrevious: string;
  spotifyStop: string;
  spotifyNext: string;
};

const copyByLanguage: Record<Language, Copy> = {
  hr: {
    places: "Mjesta",
    home: "Home",
    computer: "Computer",
    trash: "Trash",
    textFolder: "Text",
    imagesFolder: "Slike",
    close: "Zatvori",
    full: "Puni ekran",
    settings: "Postavke",
    textHub: "Tekst i Mail",
    theme: "Tema",
    dark: "Tamna",
    light: "Svijetla",
    language: "Jezik",
    english: "Engleski",
    croatian: "Hrvatski",
    folderEmpty: "Folder je trenutno prazan.",
    textFolderHint: "Desni klik ili dugme za novi TXT file.",
    preview: "Pregled",
    sendMail: "Posalji mail",
    mailSender: "Posiljalac",
    mailSubject: "Naslov",
    mailBody: "Poruka",
    newTextFile: "Novi TXT",
    emptyFiles: "Nemas lokalnih txt fileova.",
    save: "Spremi",
    discard: "Odbaci",
    unsavedPrompt: "Imas nespremljene promjene. Spremiti prije zatvaranja?",
    discardPrompt: "Odbaciti promjene?",
    createFileMenu: "Novi tekstualni fajl",
    openMailerMenu: "Pokreni mailer.exe",
    projectsFolder: "projekti",
    projectsTitle: "GitHub projekti",
    previewText: "Preview",
    delete: "Delete",
    emptyTrash: "Empty Trash",
    blockedDeleteBody: "shhh budi dobar nemoj to brisati 😄",
    spotifyNoSong: "No song playing",
    spotifyGenericError: "Dogodila se greska sa Spotify playerom.",
    spotifyPrevious: "Prev",
    spotifyStop: "Stop",
    spotifyNext: "Next",
  },
  en: {
    places: "Places",
    home: "Home",
    computer: "Computer",
    trash: "Trash",
    textFolder: "Text",
    imagesFolder: "Images",
    close: "Close",
    full: "Full",
    settings: "Settings",
    textHub: "Text & Mail",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    language: "Language",
    english: "English",
    croatian: "Croatian",
    folderEmpty: "Folder is currently empty.",
    textFolderHint: "Right click or use button to create new TXT file.",
    preview: "Preview",
    sendMail: "Send Mail",
    mailSender: "Sender",
    mailSubject: "Subject",
    mailBody: "Message",
    newTextFile: "New TXT",
    emptyFiles: "No local txt files yet.",
    save: "Save",
    discard: "Discard",
    unsavedPrompt: "You have unsaved changes. Save before closing?",
    discardPrompt: "Discard changes?",
    createFileMenu: "New text file",
    openMailerMenu: "Run mailer.exe",
    projectsFolder: "projects",
    projectsTitle: "GitHub projects",
    previewText: "Preview",
    delete: "Delete",
    emptyTrash: "Empty Trash",
    blockedDeleteBody: "shhh be good and don't delete that 😄",
    spotifyNoSong: "No song playing",
    spotifyGenericError: "Something went wrong with Spotify player.",
    spotifyPrevious: "Prev",
    spotifyStop: "Stop",
    spotifyNext: "Next",
  },
};

export const getCopy = (language: Language): Copy => copyByLanguage[language];
