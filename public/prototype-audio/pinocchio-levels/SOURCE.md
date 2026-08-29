# Pinocchio level-preview audio

- Purpose: local UX and curriculum prototype only; not a production or distribution asset.
- Story basis: *The Adventures of Pinocchio* by Carlo Collodi, translated by Carol Della Chiesa, Project Gutenberg eBook #500.
- Adaptation: new Foundation, Core, and Studio scripts written for the local Mimic prototype.
- Preview narration: generated exclusively with ElevenLabs Eleven v3 through `scripts/generate-pinocchio-elevenlabs-audio.mjs`; no system TTS assets or generator remain in this prototype.
- Active full narration: Lily (`pFZP5JQG7iQjIQuC4Bku`) is generated as one continuous master per language level, with character alignment converted into sentence timestamps. Full listening and sentence practice therefore use the same performance instead of independent sentence requests.
- Accent variants: Eleven v3 receives either `[British accent]` or `[American accent]` while retaining Lily's source voice and the same restrained scene-level emotion cues. British is complete for Foundation, Core, and Studio. American is complete for Foundation and Core.
- Current generation boundary: the American Studio master is not present because the free monthly allowance had 501 credits remaining while that request required 1,575. The local UI marks only that level/accent combination unavailable.
- Legacy comparison assets: earlier George line files and George/Jessica auditions remain locally as inactive research artifacts; the page no longer references them for lesson playback.
- Preview art: original CSS geometry in `app/dev/pinocchio-levels/pinocchio-levels.module.css`; no existing Pinocchio cover or film artwork is reused.
- Replacement boundary: production narration must be regenerated with an approved TTS provider, retained with the provider's commercial terms and voice provenance, and reviewed sentence by sentence before release.

The existing deployed Pinocchio source record remains at `public/books/pinocchio/SOURCE.md`. Project Gutenberg marks that source item as public domain in the United States; target-territory status still needs separate verification before distribution.
