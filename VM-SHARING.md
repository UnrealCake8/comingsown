# VM sharing in Mao calls

Share VM screen announces the user's assigned VM number through the Zoom command channel. Other call participants explicitly choose Watch to open https://vmNUMBER.asanib.com/#shared in a viewer iframe. This is independent of Zoom's device screen capture: no screen picker, second controller, or capture of the user's local device is needed. The user's own controller iframe stays mounted.

The existing device screen sharing button remains available. Zoom carries microphone/camera audio and video across navigation as before. Participant cards show microphone and active speaker state; audio settings switch microphones and speakers after audio is enabled (browser support varies).

VM sharing requires a deployed Selkies version that supports #shared, with session sharing enabled. If the VM requires authentication, viewers need their own access. Secure Mode deployments need provisioned viewer tokens; a bare #shared URL is insufficient there. Mao does not provision those tokens.

Only VM numbers are accepted from current call members, and URLs are constructed locally with the fixed vmNUMBER.asanib.com origin. Commands do not contain arbitrary URLs, passwords, or credentials. A VM offer is broadcast every 15 seconds for late joiners; absent offers expire after 45 seconds. Zoom's command channel is best effort, so late joiners can wait one interval, and a lost stop message can take up to 45 seconds to disappear. Explicit stop and leave send a stop announcement; participant removal also clears offers.

Stopping sharing removes the viewer in cooperating Mao clients. It does not revoke a copied VM URL or provide authorization for the underlying VM. Revocable access needs server-issued viewer tokens and a VM gateway. The command announcement is not proof of VM ownership against a modified client. The underlying VM must enforce its own access protection.

Validation: TypeScript/Vite production build, unit tests, and mocked browser tests covering sender/receiver share lifecycle, fixed viewer URLs, preservation of the owner's controller and call, unknown sender rejection, and audio selectors. A real multi-user Zoom/Selkies test still requires live participant accounts and a VM configured for viewer connections.
