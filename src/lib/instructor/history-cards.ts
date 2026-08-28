/**
 * Reviewed history cards — the cultural grounding layer.
 *
 * The instructor may only draw on these. Models recall Black and women's
 * aviation history unreliably: names blur together, quotes get fabricated,
 * dates drift. Constraining the instructor to reviewed facts with explicit
 * do-not-invent guards is the difference between representation and a
 * confidently wrong story told to a student who deserves better.
 *
 * Adding a card is a content decision, not a code change. Keep facts
 * conservative — these are teaching anchors, not biographies.
 */

export type HistoryCard = {
  id: string;
  name: string;
  oneLiner: string;
  useWhen: string;
  doNotInvent: string;
};

export const HISTORY_CARDS: HistoryCard[] = [
  {
    id: "coleman",
    name: "Bessie Coleman",
    oneLiner:
      "Bessie Coleman was the first licensed Black and Native American woman pilot. U.S. schools would not train her, so she earned her credential in France and came home to teach and inspire.",
    useWhen:
      "Access, credentials, 'can people like me do this?', starting when doors are closed.",
    doNotInvent:
      "Do not invent quotes, exact lesson dates, or aircraft types unless certain.",
  },
  {
    id: "willa-brown",
    name: "Willa Brown",
    oneLiner:
      "Willa Brown was a pilot, mechanic, and instructor who helped build training pipelines so more Black students could learn to fly in the U.S.",
    useWhen:
      "Schools, instructing, building a pathway for others, radio and training culture.",
    doNotInvent: "Do not invent school names or enrollment numbers.",
  },
  {
    id: "bragg",
    name: "Janet Harmon Bragg",
    oneLiner:
      "Janet Harmon Bragg was a registered nurse and pilot who kept training through medical and institutional barriers that tried to keep her out of the cockpit.",
    useWhen:
      "IMSAFE, medicals, persistence, being told no and still training legally and safely.",
    doNotInvent: "Do not give medical advice or invent her AME history.",
  },
  {
    id: "tuskegee",
    name: "Tuskegee Airmen",
    oneLiner:
      "The Tuskegee Airmen trained and flew under intense scrutiny. Their record was built on standards, discipline, and preparation — not on being given easier rules.",
    useWhen: "Standards, PIC responsibility, performing when people doubt you.",
    doNotInvent:
      "Do not invent kill counts, unit nicknames, or individual quotes.",
  },
  {
    id: "wasp",
    name: "Women Airforce Service Pilots (WASP)",
    oneLiner:
      "WASP pilots ferried aircraft and towed targets in WWII. They did demanding flying while fighting to be recognized as the aircrew they already were.",
    useWhen:
      "Preflight discipline, professional flying that is not glamorous, women in the cockpit.",
    doNotInvent: "Do not invent individual names or mission counts.",
  },
  {
    id: "community-airport",
    name: "Community airport pathway",
    oneLiner:
      "Many pilots start at small community airports and local nonprofits — not at a famous academy. Seeing a pilot who grew up near you fly is often the first proof the path is real.",
    useWhen: "Ramp fear, first airport visit, 'this place is not for me.'",
    doNotInvent:
      "Do not invent Fly Compton statistics or name living people without a card.",
  },
  {
    id: "latimer-engineering",
    name: "Lewis Latimer",
    oneLiner:
      "Lewis Latimer was a Black inventor and draftsman whose engineering work (including electric lighting improvements) is often left out of the popular story of American innovation.",
    useWhen:
      "Systems thinking, reading drawings, 'whose names get left off the diagram.' Keep it brief; he was not a pilot.",
    doNotInvent: "Do not claim he was an aviator. Do not invent patents.",
  },
];

export function selectHistoryCard(
  historyCardId: string | undefined,
): HistoryCard | null {
  if (!historyCardId) return null;
  return HISTORY_CARDS.find((card) => card.id === historyCardId) ?? null;
}
