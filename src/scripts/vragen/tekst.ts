import type { Taal } from "../../lib/vragen";

export interface VragenTekst {
  titel: string;
  terug: string;
  intro: string;
  vraag: string;
  naam: string;
  voorWie: string;
  tekens: string;
  versturen: string;
  lijst: string;
  leeg: string;
  hiernaast: string;
  hieronder: string;
  hint: (waar: string) => string;
  ok: (waar: string) => string;
  nu: string;
  beantwoord: string;
  allen: string;
  geenEvent: string;
  fout: string;
  netwerk: string;
}

export const TEKST: Record<Taal, VragenTekst> = {
  nl: {
    titel: "Vragen uit de zaal – Ernest Mandelfonds",
    terug: "Terug",
    intro: "Stel je vraag liever niet hardop? Stuur ze hier.",
    vraag: "Je vraag",
    naam: "Naam (niet verplicht)",
    voorWie: "Voor wie is je vraag?",
    tekens: "tekens",
    versturen: "versturen",
    lijst: "Vragen",
    leeg: "Nog geen vragen. Stel gerust de eerste.",
    hiernaast: "hiernaast",
    hieronder: "hieronder",
    hint: (waar) => `Je vraag verschijnt meteen in de lijst ${waar} en op het scherm in de zaal.`,
    ok: (waar) => `Verstuurd, dank je. Je vraag staat in de lijst ${waar}.`,
    nu: "nu",
    beantwoord: "beantwoord",
    allen: "Allen",
    geenEvent: "Op dit moment is er geen activiteit waarvoor je een vraag kan insturen.",
    fout: "Er ging iets mis. Probeer opnieuw.",
    netwerk: "Netwerkfout. Probeer later opnieuw.",
  },
  en: {
    titel: "Questions from the floor – Ernest Mandelfonds",
    terug: "Back",
    intro: "Rather not ask your question out loud? Send it here.",
    vraag: "Your question",
    naam: "Name (optional)",
    voorWie: "Who is your question for?",
    tekens: "characters",
    versturen: "send",
    lijst: "Questions",
    leeg: "No questions yet. Feel free to ask the first one.",
    hiernaast: "on the right",
    hieronder: "below",
    hint: (waar) => `Your question appears right away in the list ${waar} and on the screen in the room.`,
    ok: (waar) => `Sent, thank you. Your question is in the list ${waar}.`,
    nu: "now",
    beantwoord: "answered",
    allen: "Everyone",
    geenEvent: "There is currently no event for which you can submit a question.",
    fout: "Something went wrong. Please try again.",
    netwerk: "Network error. Please try again later.",
  },
  fr: {
    titel: "Questions de la salle – Ernest Mandelfonds",
    terug: "Retour",
    intro: "Vous préférez ne pas poser votre question à voix haute ? Envoyez-la ici.",
    vraag: "Votre question",
    naam: "Nom (facultatif)",
    voorWie: "À qui s’adresse votre question ?",
    tekens: "caractères",
    versturen: "envoyer",
    lijst: "Questions",
    leeg: "Pas encore de questions. N’hésitez pas à poser la première.",
    hiernaast: "ci-contre",
    hieronder: "ci-dessous",
    hint: (waar) => `Votre question apparaît aussitôt dans la liste ${waar} et sur l’écran de la salle.`,
    ok: (waar) => `Envoyée, merci. Votre question figure dans la liste ${waar}.`,
    nu: "en cours",
    beantwoord: "traitée",
    allen: "Tous",
    geenEvent: "Il n’y a actuellement aucune activité pour laquelle vous pouvez envoyer une question.",
    fout: "Une erreur s’est produite. Veuillez réessayer.",
    netwerk: "Erreur réseau. Veuillez réessayer plus tard.",
  },
};
