Risk Digital Twin — Source Onboarding V2

This is a consolidated replacement package. It supersedes the accidentally
unzipped one-pass patch.

Included changes:
- Removes the Yes / No technical-access form and old interview/advisor flow.
- Automatically creates one complete AI connector proposal.
- Instructs AI to infer public RSS/API/access facts rather than asking the user.
- Lets the user optionally describe changes in free form and regenerate.
- Preserves richer proposal fields returned by the backend.
- Includes a more reliable rotating AI gear fix.
- Keeps Accept and generate connector disabled until its backend endpoint exists.

Install from inside the frontend folder:
  Expand-Archive -Path .\source-onboarding-v2.zip -DestinationPath . -Force
  npm run dev
