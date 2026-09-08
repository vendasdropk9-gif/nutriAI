# Project Guidelines & Memory

## Strict Scope & Preservation Rules (Absolute Priority)
- **NEVER remove, delete, replace, simplify, or alter any existing feature, UI component, button, screen, card, style, or content** without the user explicitly asking for it.
- All fixes and modifications must be surgical: preserve 100% of existing functionality, visual layout, and code architecture.
- Do not make unsolicited refactors, redesigns, or removals under any circumstances.

## Voice Configuration Preference
- **Always use 'Aoede'** for the 'Malu' assistant's voice configuration (`prebuiltVoiceConfig` in `voiceName`).
- This ensures consistency for the Brazilian Portuguese voice, providing a natural, female-sounding quality for all live interactions, startup splash screen branding ("Nutri AI"), feedback thank-you messages, and TTS implementations.
- Never use external static audio clips or robotic browser fallbacks that mismatch Malu's Aoede voice profile.
