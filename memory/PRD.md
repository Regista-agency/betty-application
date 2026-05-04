# PRD — Betty Campobasso Annonce Generator

## Problem Statement
Outil personnel web monopage pour Betty Campobasso (conseillère immobilière IAD, région Valenciennes/Hauts-de-France) pour générer rapidement des descriptifs Facebook d'annonces immobilières dans son style signature (chaleureux, émotionnel, émoticônes structurées). L'outil archive chaque annonce dans Google Sheets et stocke les photos dans Google Drive.

## Architecture
- **Frontend**: React 19 SPA, Inter font, design IAD (bleu #1B3A6B, rose #E91E8C, blanc)
- **Backend**: FastAPI (/api prefix), MongoDB (session), Google Drive + Sheets via Service Account
- **LLM**: OpenAI GPT-5.2 via emergentintegrations (Emergent LLM Key)
- **Storage**: Google Sheets (historique biens) + Google Drive (photos)

## User Personas
- **Betty Campobasso** — seule utilisatrice (outil personnel, pas d'auth)

## Core Requirements (static)
1. Deux onglets : "Créer une annonce" + "Changer un statut"
2. Formulaire complet (type, statut, ville, surface, pièces, chambres, prix HAI, étage, points forts, infos comp, ton, photos)
3. Génération IA fidèle au style Betty (structure obligatoire, vocabulaire, émoticônes, phone 📱 07.59.61.56.54)
4. Upload photos → Google Drive (nouveau dossier par bien)
5. Sauvegarde Google Sheet "DATA-Betty"
6. Changement de statut depuis Sheet → régénère annonce avec nouveau statut
7. Hashtags suggérés + compteur de caractères + copie + régénération

## Implemented (2026-02)
- ✅ Backend /api/health, /api/photos/upload, /api/biens/generate, /api/biens, /api/biens/{id}/change-statut
- ✅ Google Drive + Sheets via Service Account
- ✅ GPT-5.2 avec system prompt exact (vocabulaire, structure, émoticônes)
- ✅ Frontend UI complète : header IAD, tabs, formulaire, drag-drop photos, card résultat, hashtags pills, char count
- ✅ Responsive mobile
- ✅ Tested: backend 5/6, frontend 100% flows

## Known Limitations
- Upload photos Drive échoue si le dossier racine est dans un Drive personnel (limitation Google Service Account). L'app gère l'erreur gracieusement : annonce générée sans photos + toast d'avertissement. **Fix**: Betty doit créer un Shared Drive (Google Workspace) et mettre à jour GOOGLE_DRIVE_ROOT_FOLDER_ID dans `.env`.

## Backlog
- P1: Shared Drive migration (voir above)
- P2: Édition manuelle de l'annonce avant copie
- P2: Suppression d'un bien depuis le Sheet (bouton archive)
- P2: Templates personnalisés par type de bien
- P2: Export PDF pour flyer imprimé
- P3: Pagination/recherche dans l'historique
- P3: Statistiques (nb annonces créées, taux de vente, etc.)
