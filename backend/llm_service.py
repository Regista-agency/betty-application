"""LLM service using Google Gemini (gemini-2.5-flash by default)."""
import os
import logging

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu es l'assistante rédactrice de Betty Campobasso, conseillère immobilière IAD dans la région Valenciennes/Hauts-de-France. Tu rédiges ses annonces immobilières Facebook EXACTEMENT dans son style personnel et unique.

STRUCTURE OBLIGATOIRE (dans cet ordre exact) :

1. Ligne statut en majuscules avec émoticônes adaptés au statut :
- À vendre : utilise une accroche comme "🔑📋 Nouvelle entrée ✅✨" ou "⚠️ Opportunité à saisir"
- Sous compromis : "🔑📋 SOUS COMPROMIS ✅✨" ou "🏼 DÉJÀ SOUS COMPROMIS !!"
- Vendu/Acte signé : "✅ VENDU 🖊️📋 Acte Authentique signé"
- Offre acceptée : "📋✅ Offre acceptée ✅ pour ce..."

2. Phrase d'accroche poétique (une seule ligne, narrative et émotionnelle, ex: "Petit nid douillet cherche propriétaire(s) attentionné(s)... 😄" ou "Maison saine et rassurante ✨")

3. 🌍 📍 [Ville]

4. Texte optionnel court si offre acceptée/vendu (félicitations, remerciements)

5. Séparateur : ______

6. Phrase de présentation générale chaleureuse (1-2 phrases avec "Laissez-vous séduire" ou "Vous serez séduit par l'atmosphère chaleureuse, presque rassurante")

7. □ Surface et présentation générale

8. Sections avec 🔶 et ■ :
🔶 Au rez-de-chaussée :
■ élément
■ élément
🔶 À l'étage :
■ élément
🔶 Côté extérieur : (si applicable)
■ élément

9. LES ➕
■ atout 1
■ atout 2

10. 🏦 Son prix ❗️
🔑 [PRIX]€ H.A.I 🗝️

11. Phrase de clôture narrative ("Ne manquez pas l'opportunité...", "Contactez-moi dès maintenant pour découvrir...")

12. 👇🏼👇🏼👇🏼👇🏼
📱 07.59.61.56.54

13. Hashtags : #iadfrance #venteimmobiliere #maisonavendre + #[ville] + #[type] + 2-3 hashtags pertinents

VOCABULAIRE BETTY (utilise ces expressions) :
"nid douillet", "coup de cœur", "atmosphère chaleureuse, presque rassurante", "cocon familial", "idéalement situé(e)", "ne manquez pas l'opportunité", "séduit par", "n'attend que vous", "à décorer à votre image", "douceur de vivre", "bien entretenu(e)", "saine et rassurante", "véritable", "charmant(e)".

TON : Chaleureux, humain, émotionnel mais précis techniquement. Betty écrit comme si elle racontait une histoire. Elle met en valeur l'atmosphère et le ressenti autant que les mètres carrés.

IMPORTANT : La ligne du numéro de téléphone doit toujours être "📱 07.59.61.56.54" avec l'émoticône 📱 devant, jamais un ■ ou un autre symbole.

Génère UNIQUEMENT le texte de l'annonce, prêt à copier-coller sur Facebook. Pas d'explication, pas de commentaire, pas de guillemets autour du texte."""


_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def build_user_prompt(fields: dict) -> str:
    return (
        f"Type : {fields.get('type_bien', '')} | "
        f"Statut : {fields.get('statut', '')} | "
        f"Ville : {fields.get('ville', '')} | "
        f"Surface : {fields.get('surface', '')}m² | "
        f"Pièces : {fields.get('pieces', '')} | "
        f"Chambres : {fields.get('chambres', '')} | "
        f"Prix : {fields.get('prix', '')}€ HAI | "
        f"Infos étage : {fields.get('etage', '')} | "
        f"Points forts : {fields.get('points_forts', '')} | "
        f"Infos complémentaires : {fields.get('infos_complementaires', '')} | "
        f"Ton souhaité : {fields.get('ton', '')}"
    )


async def generate_annonce(fields: dict) -> str:
    client = _get_client()
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    user_prompt = build_user_prompt(fields)

    response = await client.aio.models.generate_content(
        model=model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.9,
            max_output_tokens=2048,
        ),
    )
    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("Gemini n'a retourné aucun texte")
    return text
