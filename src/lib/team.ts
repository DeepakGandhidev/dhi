/**
 * The DHI leadership team, in the order it appears on /about.
 * Copy is DHI's own, in French, exactly as supplied.
 * Photos live in /public/team.
 */
export type TeamPoint = {
  label: string;
  text?: string;
  /** Rendered as a row of tags instead of a sentence. */
  tags?: string[];
};

export type TeamMember = {
  id: string;
  /** Null until the profile text is supplied; the card then says so. */
  name: string | null;
  roles: string[];
  photo: string;
  /** Where to anchor the crop when the photo is not already a square portrait. */
  focus?: string;
  tagline?: string[];
  intro?: string[];
  points?: TeamPoint[];
  quote?: string;
};

export const TEAM: TeamMember[] = [
  {
    id: "bodjona",
    name: "Mme BODJONA Sinam Épse BAKELE",
    roles: ["Manager & CEO", "Divine Health International"],
    photo: "/team/bodjona.jpg",
    tagline: ["Une vision portée par l’humain,", "un leadership guidé par l’excellence."],
    intro: [
      "À la tête de Divine Health International, Mme BODJONA Sinam Épse BAKELE incarne une vision moderne du leadership, fondée sur l’écoute, l’engagement et la volonté de faire grandir les talents.",
      "Son approche place l’humain au cœur de la réussite : accompagner, inspirer, fédérer et donner à chacun la possibilité de révéler son potentiel.",
      "À travers DHI, elle porte une ambition claire : construire une communauté forte autour de la santé, du bien-être et de l’opportunité, dans un esprit de confiance, de collaboration et de développement durable.",
    ],
  },
  {
    id: "metangni",
    name: "M. METANGNI Henri Joël Hermel",
    roles: [
      "PDG de VIDIS GROUP SARL | Directeur Afrique DHI",
      "Nutritionniste Naturopathe, conseiller en biothérapie cellulaire.",
    ],
    photo: "/team/metangni.jpg",
    focus: "50% 8%",
    points: [
      {
        label: "Bâtisseur de projets",
        text: "Entrepreneur engagé dans la création et le développement d’initiatives utiles et durables.",
      },
      {
        label: "Une vision claire",
        text: "Valoriser les talents, développer des projets créateurs de valeur et contribuer au développement de l’Afrique.",
      },
      {
        label: "Une expérience qui inspire",
        text: "Son parcours et son expérience des solutions naturelles l’ont conduit à contribuer au développement de certains protocoles et produits de DHI International.",
      },
      {
        label: "Sa philosophie",
        text: "Transformer les expériences en projets utiles, accessibles et porteurs d’espoir.",
      },
    ],
  },
  {
    id: "lebi",
    name: "Dr Audrey LEBI",
    roles: ["Directeur Marketing", "Chargé de la Planification et de la Stratégie"],
    photo: "/team/lebi.jpg",
    points: [
      {
        label: "Expertise & parcours",
        text: "Spécialiste du marketing, de la stratégie et du développement des affaires, avec une solide expérience dans plusieurs environnements professionnels africains.",
      },
      {
        label: "Secteurs d’activité",
        text: "Expérience dans l’assurance, le commerce et l’e-commerce, avec une expertise en développement et pilotage de projets.",
      },
      {
        label: "Expérience de direction",
        text: "Responsabilités de direction dans plusieurs entreprises africaines, notamment en structuration, développement commercial et croissance.",
      },
      {
        label: "Une approche globale",
        tags: [
          "Planification stratégique",
          "Analyse des marchés",
          "Innovation marketing",
          "Développement commercial",
          "Transformation digitale",
        ],
      },
      {
        label: "Vision & engagement",
        text: "Une vision du développement fondée sur l’innovation, l’excellence opérationnelle et les opportunités du numérique.",
      },
    ],
  },
  {
    id: "nougbodohoue",
    name: "NOUGBODOHOUE ERIC MARCOS BLANCHARD",
    roles: [
      "SAGE – Consultant en santé • Directeur des Ressources Humaines DHI",
      "Chargé de la formation du personnel et des leaders",
    ],
    photo: "/team/nougbodohoue.jpg",
    points: [
      {
        label: "Expertise & expérience",
        text: "Spécialiste en gestion des ressources humaines, organisation et développement des affaires.",
      },
      {
        label: "Expérience MLM & réseaux",
        text: "Expérience dans la création, l’animation et la structuration des réseaux commerciaux.",
      },
      {
        label: "Conseil & développement",
        text: "Accompagnement des entreprises dans leur implantation et leur développement sur les marchés africains.",
      },
      {
        label: "Formation & leadership",
        text: "Formateur et coach, il accompagne les équipes et développe les compétences des futurs leaders.",
      },
      {
        label: "Bien-être & e-commerce",
        text: "Expérience dans le secteur du bien-être, des compléments alimentaires et du commerce digital.",
      },
      {
        label: "Vision & stratégie",
        text: "Une approche fondée sur la discipline, le travail en équipe et la recherche de résultats durables.",
      },
    ],
  },
  {
    id: "dossou",
    name: "M. DOSSOU Marcharles",
    roles: ["PDG de SIC au Togo | IT Consultant de DHI"],
    photo: "/team/dossou.jpg",
    points: [
      {
        label: "Expertise",
        text: "Expert en informatique et technologies numériques, spécialisé dans la conception et la mise en œuvre de solutions digitales pour les entreprises.",
      },
      {
        label: "Domaines d’intervention",
        tags: [
          "Développement web",
          "Digitalisation",
          "Plateformes numériques",
          "Innovation technologique",
          "Transformation digitale",
        ],
      },
      {
        label: "Vision",
        text: "Mettre la technologie au service de l’entrepreneuriat et du développement économique en Afrique.",
      },
      {
        label: "Engagement",
        text: "Promouvoir l’innovation numérique, moderniser les services et accompagner la transformation digitale des organisations.",
      },
    ],
    quote:
      "La technologie doit être un levier d’innovation, de performance et de développement durable pour les entreprises africaines.",
  },
];
