# Android app design concepts

Status: the revised board 05 was approved with “okay build it” on 23 October 2026. The Android pilot is implemented in ../../mobile; boards 01–04 remain rejected historical proposals.

The requested review covers 24 primary screens and important states across four generated image boards:

1. Getting started and trusted contacts: Welcome; Sign in; Home; My Circle; Add contact; Personal safety plan.
2. Urgent and active safety: Get help / SOS; Active safety setup; 20-second check-in; Alert status; Journey sharing; Nearby help.
3. Guidance and private records: Guide library; Guide detail; Support directory; My Space; New private note; Evidence records.
4. Ongoing support and privacy: New support request; Request progress; Support conversation; Privacy settings; Offline/permissions status; Android home-screen widget.

Preserve the existing rose accent, dark readable typography, and simple shield brand cue. Use a light warm-neutral surface for everyday use and a restrained dark urgent-state screen. Native Android conventions, large touch controls, Home / My Circle / Guide / My Space navigation, clear privacy boundaries, and explicit send/delivery/acknowledgment states.

These are static visual proposals with fictional sample records, not working screens. Nearby responders, live sharing, sensor automation, and staffed support remain conditional capabilities described in APP_PLAN.md and ACTIVE_SAFETY.md. Approval of a visual does not make those capabilities operational.

Generated with the built-in image-generation tool. Exact prompts are retained alongside each board. This directory is a review artifact, not the approved design system.

## Review boards

- [Everyday support](01-everyday-support.png)
- [Help in the moment](02-urgent-safety.png)
- [Guidance and private records](03-guidance-records.png)
- [Support and control](04-support-privacy.png)

The four exact built-in prompts are saved as `01-prompt.txt` through `04-prompt.txt`. Boards 2–4 use board 1 as the visual reference.

## Details to resolve after visual review

Generated sample dates, contact information, services, and messages are illustrative. Copy is not approved operational content. In particular, alert summaries must reflect each recipient's actual delivery state; active safety must not claim device support until tested; location-sharing settings must be opt-in; and deleting an account must describe cloud and local retention accurately. These images set a proposed visual direction, not final behavioral specifications or evidence of implementation.

## Revised direction — approved

The initial boards were rejected as too bland. [Redesigned core screens](05-redesigned-core-screens.png) explores a warmer editorial direction across Home, My Circle, SOS, the sensor countdown, Journey, and My Space. It introduces plum and parchment for everyday structure, coral for urgency, jade for meaningful states, relationship diagrams for contacts, and different layouts for different tasks. The generated display typography is editorial serif; the implementation uses Lora for headings and Inter for controls/body. All contact portraits and journey details are illustrative.

The user approved this revised visual direction. The implementation uses real empty states instead of fictional sample people or journey records; delivery, volunteer and sensor claims follow actual capability. The exact prompt is in 05-prompt.txt; the built-in image-generation tool was used without reference imagery.
