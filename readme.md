# 🛴 ScooterTrace

Students photograph scooters around campus. If a scooter that was reported stolen shows up in a photo, its owner gets an alert.

- **Frontend:** React (Vite), in `frontend/`
- **Backend:** FastAPI (Python), in `backend/`
- **Database:** SQLite. It's a single file, `backend/scootertrace.db`, created automatically. It is not in git, so everyone has their own local copy.

## Run it locally

You need 2 terminals.

**Terminal 1: backend** (http://localhost:8000, test it at http://localhost:8000/docs)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Terminal 2: frontend** (open http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

Sign up with any `@illinois.edu` email. Nothing is actually emailed; it's just a local account.

After the first time, you only need `source .venv/bin/activate` + `uvicorn ...` and `npm run dev`.

## Who works where

Each feature has its own files, so you shouldn't need to edit the same files.

| | Feature 1: Register a scooter | Feature 2: Submit a sighting |
|---|---|---|
| Page | `frontend/src/pages/RegisterScooter.jsx` | `frontend/src/pages/SubmitSighting.jsx` |
| Backend | `backend/app/routers/scooters.py` | `backend/app/routers/sightings.py` |
| Table | `scooters` (create it in `init_tables()`) | `sightings` (create it in `init_tables()`) |

Shared files (only change these together):

- `backend/app/auth.py`: sign up, log in, and `get_current_user`
- `backend/app/db.py`: database connection
- `frontend/src/api.js`: `api()` helper for calling the backend
- `frontend/src/AuthContext.jsx`: `useAuth()` gives you the logged-in `user`

## How to use the login in your feature

**Backend:** add `user=Depends(get_current_user)` to an endpoint to require login.

```python
@router.post("")
def create_scooter(user=Depends(get_current_user), db=Depends(get_db)):
    # user is {"id": 1, "email": "netid@illinois.edu"}
    ...
```

**Frontend:** use `api()`, which sends the login token for you.

```js
import { api } from "../api.js";

const scooters = await api("/scooters/mine");
await api("/sightings", { method: "POST", body: formData }); // photos: pass FormData
```

## Git workflow

1. Work on your own branch, not `main`:
   ```bash
   git switch main
   git pull
   git switch -c feature/register-scooter   # or feature/submit-sighting
   ```
2. Commit and push your branch: `git push -u origin feature/register-scooter`
3. Open a Pull Request on GitHub and merge it into `main` when it works.

## Agree on together

Store brand and color the same way in both tables: lowercase, picked from the same dropdown list (for example `"black"`, never `"Black"`). Matching compares them exactly.
