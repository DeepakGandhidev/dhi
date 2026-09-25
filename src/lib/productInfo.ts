/**
 * Role and benefits of each DHI product, shown on /produits and the
 * marketplace product pages.
 *
 * DRAFT WORDING: the official price list gives names, prices and PV only.
 * These texts describe what each product is intended to support, in
 * cautious "helps / supports" language, and must be checked against DHI's
 * own product sheets before being relied on. Edit them here.
 */
export type ProductInfo = { role: string; benefits: [string, string, string] };

export const PRODUCT_INFO: Record<string, ProductInfo> = {
  "coenzyme-q10-coq10": {
    role: "Antioxydant présent dans chaque cellule, impliqué dans la production d’énergie.",
    benefits: ["Contribue à l’énergie cellulaire", "Soutient le cœur et les muscles", "Aide à protéger les cellules du stress oxydatif"],
  },
  equitenseur: {
    role: "Formule d’accompagnement pour l’équilibre de la tension artérielle.",
    benefits: ["Aide au maintien d’une tension équilibrée", "Soutient une bonne circulation sanguine", "À associer à une alimentation pauvre en sel"],
  },
  aldosterone: {
    role: "Formule de soutien de l’équilibre hydrique et minéral de l’organisme.",
    benefits: ["Soutient l’équilibre eau et sels minéraux", "Accompagne le bien-être cardiovasculaire", "Participe à la vitalité générale"],
  },
  "natural-biotic": {
    role: "Probiotiques pour l’équilibre de la flore intestinale.",
    benefits: ["Favorise une flore intestinale équilibrée", "Soutient la digestion et le transit", "Contribue aux défenses naturelles"],
  },
  "colon-cleaner": {
    role: "Formule de nettoyage et de confort du côlon.",
    benefits: ["Favorise un transit régulier", "Aide l’organisme à éliminer", "Procure une sensation de légèreté"],
  },
  "hemo-digesti": {
    role: "Formule de confort digestif et veineux.",
    benefits: ["Soutient le confort digestif", "Favorise un transit régulier", "Accompagne le confort veineux et hémorroïdaire"],
  },
  glucosamine: {
    role: "Composant naturel du cartilage, pour le confort des articulations.",
    benefits: ["Soutient le cartilage articulaire", "Favorise la souplesse et la mobilité", "Accompagne les articulations sollicitées"],
  },
  "man-plus-extra": {
    role: "Formule de vitalité masculine.",
    benefits: ["Soutient l’énergie et l’endurance", "Accompagne la vitalité masculine", "Aide à lutter contre la fatigue"],
  },
  "men-fertility": {
    role: "Formule de soutien de la fertilité masculine.",
    benefits: ["Soutient la qualité spermatique", "Apporte des nutriments clés à la fertilité", "Accompagne la vitalité masculine"],
  },
  "woman-fertility": {
    role: "Formule de soutien de la fertilité féminine.",
    benefits: ["Accompagne l’équilibre hormonal", "Soutient la régularité du cycle", "Apporte des nutriments clés à la conception"],
  },
  "active-cellular": {
    role: "Formule de nutrition et de régénération cellulaire.",
    benefits: ["Soutient le renouvellement des cellules", "Apporte des antioxydants", "Contribue à la vitalité générale"],
  },
  "mind-plus": {
    role: "Formule pour le cerveau et les fonctions cognitives.",
    benefits: ["Soutient la mémoire et la concentration", "Aide à réduire la fatigue mentale", "Accompagne les périodes d’effort intellectuel"],
  },
  "calcium-magnesium-zinc": {
    role: "Association de trois minéraux essentiels.",
    benefits: ["Contribue à des os et des dents solides", "Soutient les muscles et le système nerveux", "Participe au bon fonctionnement immunitaire"],
  },
  "liver-protect": {
    role: "Formule de soutien du foie.",
    benefits: ["Soutient la fonction hépatique", "Accompagne la détoxination de l’organisme", "Favorise la digestion des graisses"],
  },
  "kidneys-protect": {
    role: "Formule de soutien des reins.",
    benefits: ["Soutient la fonction rénale", "Favorise l’élimination urinaire", "Accompagne la filtration de l’organisme"],
  },
  "pros-x": {
    role: "Formule de confort de la prostate.",
    benefits: ["Soutient la santé de la prostate", "Favorise le confort urinaire", "Adapté aux hommes à partir de 40 ans"],
  },
  "sino-rhinite": {
    role: "Formule de confort des voies respiratoires supérieures.",
    benefits: ["Soutient le confort du nez et des sinus", "Accompagne les périodes de changement de saison", "Favorise une respiration dégagée"],
  },
  nasalet: {
    role: "Soin de confort nasal.",
    benefits: ["Aide à dégager le nez", "Favorise une respiration nasale confortable", "Accompagne les voies respiratoires sensibles"],
  },
  "base-forte": {
    role: "Formule minérale pour l’équilibre acido-basique.",
    benefits: ["Soutient l’équilibre acido-basique", "Apporte des minéraux alcalinisants", "Contribue à la vitalité"],
  },
  "anti-age": {
    role: "Formule antioxydante contre les effets du temps.",
    benefits: ["Aide à protéger les cellules du vieillissement", "Soutient l’éclat de la peau", "Contribue à la vitalité générale"],
  },
  lutein: {
    role: "Pigment naturel concentré dans la rétine, pour la santé des yeux.",
    benefits: ["Soutient la santé de la rétine", "Aide à protéger les yeux de la lumière bleue", "Contribue au maintien d’une vision normale"],
  },
  "anti-anemie": {
    role: "Formule pour la formation des globules rouges.",
    benefits: ["Apporte des nutriments utiles aux globules rouges", "Aide à réduire la fatigue", "Soutient le transport de l’oxygène"],
  },
  "the-cholesterol": {
    role: "Infusion de plantes pour l’équilibre lipidique.",
    benefits: ["Accompagne l’équilibre du cholestérol", "Soutient la digestion", "À associer à une alimentation équilibrée"],
  },
  "the-ventre-reduit": {
    role: "Infusion de plantes pour la ligne.",
    benefits: ["Accompagne la réduction du ventre", "Favorise la digestion et le transit", "À associer à une activité physique"],
  },
  cafe: {
    role: "Café enrichi pour l’énergie au quotidien.",
    benefits: ["Donne un coup de fouet énergétique", "Aide à rester concentré", "Le plaisir d’un café chaque jour"],
  },
  "gel-celan": {
    role: "Gel de soin à appliquer sur la peau.",
    benefits: ["Application locale facile", "Procure une sensation d’apaisement", "Soutient le confort de la peau"],
  },
  palucure: {
    role: "Formule de plantes pour soutenir les défenses de l’organisme.",
    benefits: ["Soutient les défenses naturelles", "Accompagne les périodes de fatigue", "Ne remplace pas un traitement antipaludique : en cas de fièvre, consultez"],
  },
  hemato: {
    role: "Formule de soutien du sang et de la circulation.",
    benefits: ["Soutient la formation des cellules sanguines", "Favorise une bonne circulation", "Aide à lutter contre la fatigue"],
  },
};

export const PRODUCT_DISCLAIMER =
  "Compléments alimentaires : ils ne remplacent ni une alimentation variée et équilibrée, ni un traitement médical. Demandez conseil à un professionnel de santé en cas de maladie, de grossesse ou de traitement en cours.";
