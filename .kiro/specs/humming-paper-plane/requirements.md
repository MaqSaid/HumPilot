# Requirements Document

## Introduction

A browser-based game where the player controls the altitude of a paper plane by humming into their microphone. The game uses the Web Audio API to capture microphone input and detect the pitch of the player's humming in real time. Higher-pitched humming moves the plane up; lower-pitched humming moves it down. The plane auto-scrolls horizontally through a procedurally generated obstacle course, and the player must dodge obstacles to survive as long as possible.

## Glossary

- **Game**: The browser-based humming paper plane application
- **Player**: The human user interacting with the Game via microphone input
- **Plane**: The paper plane avatar displayed on screen whose vertical position the Player controls
- **Pitch_Detector**: The component that analyzes microphone audio to determine the fundamental frequency of the Player's humming
- **Obstacle_Generator**: The component that creates and positions obstacles in the game world
- **Obstacle**: A visual element on the game canvas that the Plane must avoid
- **Altitude**: The vertical position of the Plane on the game canvas, ranging from the bottom to the top of the playable area
- **Game_Canvas**: The HTML5 Canvas element where the game is rendered
- **Score_Tracker**: The component that tracks and displays the Player's current score
- **Collision_Detector**: The component that determines whether the Plane has contacted an Obstacle
- **Audio_Capture**: The component that requests microphone access and streams audio data to the Pitch_Detector
- **Game_Loop**: The main rendering and update cycle that drives the Game at a consistent frame rate
- **Pitch_Range**: The frequency band (approximately 80 Hz to 500 Hz) mapped to the full vertical extent of the Game_Canvas
- **Calibration_Screen**: The component that captures the Player's personal vocal range for customized pitch mapping
- **Ambient_Music**: The generative audio component that produces harmonizing tones during gameplay using Web Audio oscillators
- **Daily_Seed**: A date-derived value used to seed the random number generator for reproducible obstacle layouts
- **Service_Worker**: The background script that caches game assets for offline play

## Requirements

### Requirement 1: Microphone Access and Audio Capture

**User Story:** As a Player, I want the Game to access my microphone, so that my humming can be used to control the Plane.

#### Acceptance Criteria

1. WHEN the Player starts the Game, THE Audio_Capture SHALL request microphone access from the browser
2. WHEN the Player grants microphone permission, THE Audio_Capture SHALL begin streaming audio data to the Pitch_Detector within 1 second of permission being granted
3. IF the Player denies microphone permission, THEN THE Game SHALL display a message explaining that microphone access is required to play and SHALL remain on the start screen allowing the Player to reattempt
4. IF the microphone stream is interrupted during gameplay, THEN THE Game SHALL pause gameplay, display a notification informing the Player that microphone access was lost, and provide an option to resume once the microphone stream is restored
5. IF the browser does not support the required audio capture capabilities, THEN THE Game SHALL display a message indicating that the browser is not supported and SHALL not attempt to start gameplay

### Requirement 2: Pitch Detection

**User Story:** As a Player, I want the Game to detect the pitch of my humming accurately, so that my Plane responds smoothly to my input.

#### Acceptance Criteria

1. WHILE the Audio_Capture is streaming, THE Pitch_Detector SHALL analyze audio data and output a detected frequency at least 30 times per second
2. THE Pitch_Detector SHALL detect fundamental frequencies within the Pitch_Range of 80 Hz to 500 Hz with an accuracy of ±3 Hz
3. WHEN the Pitch_Detector detects a frequency within the Pitch_Range, THE Pitch_Detector SHALL output the detected frequency value in Hertz
4. WHEN the audio input signal does not contain a detectable pitched tone (due to silence, background noise, or amplitude below a minimum confidence threshold), THE Pitch_Detector SHALL output a null value indicating no valid pitch
5. IF the Pitch_Detector detects a pitched frequency outside the Pitch_Range (below 80 Hz or above 500 Hz), THEN THE Pitch_Detector SHALL output a null value indicating no valid pitch

### Requirement 3: Pitch-to-Altitude Mapping

**User Story:** As a Player, I want my humming pitch to control the Plane's altitude, so that I can navigate through obstacles intuitively.

#### Acceptance Criteria

1. WHEN the Pitch_Detector outputs a valid frequency within the Pitch_Range, THE Game SHALL map that frequency linearly to an Altitude value between the bottom and the top of the Game_Canvas
2. THE Game SHALL map the lowest frequency in the Pitch_Range (80 Hz) to the lowest Altitude on the Game_Canvas
3. THE Game SHALL map the highest frequency in the Pitch_Range (500 Hz) to the highest Altitude on the Game_Canvas
4. WHEN the Pitch_Detector outputs a null value, THE Plane SHALL descend from its current Altitude at a constant rate of no more than 150 pixels per second until it reaches the bottom boundary of the Game_Canvas
5. THE Game SHALL limit the Altitude change between consecutive frames to no more than 10% of the Game_Canvas height, smoothing transitions so that the Plane does not jump instantaneously to the target Altitude
6. IF the Pitch_Detector outputs a frequency below 80 Hz or above 500 Hz, THEN THE Game SHALL clamp the mapped Altitude to the nearest boundary of the Game_Canvas

### Requirement 4: Plane Rendering and Auto-Scrolling

**User Story:** As a Player, I want to see a paper plane moving forward through the game world, so that I have visual feedback of my progress.

#### Acceptance Criteria

1. THE Game_Loop SHALL render the Plane on the Game_Canvas at a frame rate of at least 30 frames per second, where no more than 10% of frames within any 1-second window may exceed 33 milliseconds of frame time
2. THE Game SHALL scroll the game world horizontally from right to left at a constant speed of 200 pixels per second, independent of the current frame rate
3. THE Game SHALL render the Plane at a fixed horizontal position within the left third (0% to 33%) of the Game_Canvas width
4. WHEN the Plane's Altitude changes, THE Game_Loop SHALL update the Plane's vertical position on the Game_Canvas within the same frame
5. WHILE the Game is in the playing state, THE Game SHALL move all game-world elements (Obstacles, background) leftward at the scroll speed to simulate forward motion of the Plane

### Requirement 5: Obstacle Generation

**User Story:** As a Player, I want obstacles to appear in my path, so that the game presents a challenge I must navigate.

#### Acceptance Criteria

1. THE Obstacle_Generator SHALL create Obstacles with a vertical gap of at least 1.5 times the Plane's bounding box height, ensuring the Plane can pass through
2. THE Obstacle_Generator SHALL spawn Obstacles at an initial interval of no less than 2 seconds and no more than 4 seconds apart, measured from the trailing edge of the previous Obstacle to the leading edge of the next
3. THE Obstacle_Generator SHALL position the gap opening at a random Altitude that is at least one Plane height away from both the top and bottom boundaries of the Game_Canvas
4. WHILE the Game is active, THE Obstacle_Generator SHALL increase difficulty by reducing the gap size or increasing spawn frequency, but SHALL NOT reduce the gap below 1.2 times the Plane's bounding box height nor the spawn interval below 1 second
5. THE Obstacle_Generator SHALL place Obstacles off-screen to the right and scroll them leftward at the same speed as the game world scroll defined in the Plane Rendering requirement
6. WHEN an Obstacle has fully scrolled past the left edge of the Game_Canvas, THE Obstacle_Generator SHALL remove that Obstacle from the active game objects

### Requirement 6: Collision Detection

**User Story:** As a Player, I want the Game to detect when my Plane hits an obstacle, so that the game ends fairly when I fail to dodge.

#### Acceptance Criteria

1. THE Collision_Detector SHALL check for overlap between the Plane's axis-aligned bounding rectangle and each visible Obstacle's axis-aligned bounding rectangle every frame, where overlap is defined as any non-zero intersection area between the two rectangles
2. WHEN the Collision_Detector detects an overlap between the Plane and an Obstacle, THE Game SHALL transition to the game-over state within the same frame
3. WHEN any part of the Plane's bounding rectangle moves fully above the top edge or fully below the bottom edge of the Game_Canvas, THE Game SHALL transition to the game-over state within the same frame

### Requirement 7: Scoring

**User Story:** As a Player, I want to see my score increase as I play, so that I can track my performance and try to improve.

#### Acceptance Criteria

1. WHILE the Game is active, THE Score_Tracker SHALL increment the score by 1 point for each 10 pixels of horizontal distance the game world scrolls
2. WHEN the Plane's trailing edge moves past the trailing edge of an Obstacle, THE Score_Tracker SHALL add 10 bonus points to the score
3. WHILE the Game is in the playing state, THE Score_Tracker SHALL display the current score as a numeric value in the top-right corner of the Game_Canvas without obscuring the Plane or Obstacles
4. WHEN the Game transitions to the playing state, THE Score_Tracker SHALL set the score to 0

### Requirement 8: Game State Management

**User Story:** As a Player, I want clear game states (start, playing, game over), so that I understand what is happening at each stage.

#### Acceptance Criteria

1. WHEN the Game loads, THE Game SHALL display a start screen that includes the game title, a description of the humming-based control mechanism, and a visible start action
2. WHEN the Player activates the start action and microphone access is granted, THE Game SHALL transition to the playing state
3. IF the Player activates the start action and microphone access is denied, THEN THE Game SHALL remain on the start screen and display a message indicating that microphone access is required
4. WHEN a collision or boundary violation occurs, THE Game SHALL transition to the game-over state and stop the Game_Loop from updating Plane position and Obstacle movement
5. WHEN the game-over state is reached, THE Game SHALL display the final score and a visible restart action
6. WHEN the Player activates the restart action, THE Game SHALL reset the score to zero, return the Plane to its initial Altitude, remove all existing Obstacles, reset difficulty to its initial level, and transition to the playing state

### Requirement 9: Visual Presentation

**User Story:** As a Player, I want the game to look appealing with a paper/sketch art style, so that the experience feels polished and fun.

#### Acceptance Criteria

1. THE Game SHALL render the Plane using hand-drawn-style outlines and a flat or lightly shaded fill, visually resembling a folded paper plane
2. THE Game SHALL render Obstacles using hand-drawn-style outlines and fills that are visually consistent with the Plane's art style
3. THE Game SHALL render the Plane, Obstacles, and background with sufficient visual contrast so that each element is clearly distinguishable from the others
4. THE Game SHALL render a background that scrolls horizontally in the same direction as the game world movement, creating a continuous parallax or motion effect with no visible seams or gaps
5. THE Game SHALL render the Game_Canvas at a minimum resolution of 800x600 pixels, scaling the canvas to fill the available browser viewport while maintaining the game's aspect ratio

### Requirement 10: Performance

**User Story:** As a Player, I want the game to run smoothly, so that my controls feel responsive and the experience is enjoyable.

#### Acceptance Criteria

1. WHILE up to 10 Obstacles are visible on the Game_Canvas simultaneously, THE Game_Loop SHALL maintain a frame rate of at least 30 frames per second on desktop browsers released within the last 2 years running on hardware with at least 4 GB of RAM and a dual-core processor
2. THE Pitch_Detector SHALL introduce no more than 50 milliseconds of latency between the Player's humming and the corresponding Altitude change, measured from audio sample capture to the Plane's vertical position update on the Game_Canvas
3. THE Game SHALL load, render the Game_Canvas, capture microphone input, detect pitch, and respond to Player humming in the latest versions of Chrome, Firefox, and Edge browsers without requiring browser-specific workarounds or plugins
4. IF the frame rate drops below 20 frames per second for more than 3 consecutive seconds, THEN THE Game SHALL reduce the number of visible Obstacles or visual effects until the frame rate recovers to at least 30 frames per second

### Requirement 11: Pitch Calibration

**User Story:** As a Player, I want the Game to calibrate to my personal vocal range, so that the controls feel natural regardless of my voice type.

#### Acceptance Criteria

1. WHEN the Player has not completed calibration and starts the Game for the first time, THE Game SHALL present the Calibration_Screen asking the Player to hum their lowest comfortable note and their highest comfortable note
2. WHEN the Player completes the calibration humming, THE Calibration_Screen SHALL record the Player's personal frequency range as a low bound and a high bound in Hertz
3. WHILE calibration data exists, THE Game SHALL map the Player's personal frequency range to the full Altitude range of the Game_Canvas, replacing the default Pitch_Range of 80 Hz to 500 Hz
4. WHEN the Player completes calibration, THE Game SHALL save the calibration data to localStorage so that the calibration persists across browser sessions
5. THE Game SHALL display a recalibrate action on the start screen that allows the Player to repeat the calibration process at any time
6. IF no calibration data exists in localStorage, THEN THE Game SHALL use the default Pitch_Range of 80 Hz to 500 Hz as the frequency-to-Altitude mapping

### Requirement 12: Generative Ambient Music

**User Story:** As a Player, I want the Game to generate ambient music that harmonizes with my humming, so that playing feels musical and rewarding.

#### Acceptance Criteria

1. WHILE the Game is in the playing state, THE Ambient_Music SHALL generate tones using Web Audio API oscillators
2. WHILE the Pitch_Detector outputs a valid frequency, THE Ambient_Music SHALL produce harmonizing tones relative to the Player's current detected pitch (such as a perfect fifth or octave below the detected frequency)
3. WHEN the Pitch_Detector outputs a null value, THE Ambient_Music SHALL play a soft drone tone at a fixed base frequency
4. THE Ambient_Music SHALL maintain a volume level lower than the Player's humming input so that the ambient tones remain in the background and do not dominate the audio experience
5. THE Game SHALL provide a mute/unmute toggle for the Ambient_Music that is accessible during gameplay, allowing the Player to silence the ambient tones without affecting other game functionality
6. WHEN the Game transitions to the playing state, THE Ambient_Music SHALL start playing, and WHEN the Game transitions to the game-over state or is paused, THE Ambient_Music SHALL stop playing

### Requirement 13: Daily Challenge

**User Story:** As a Player, I want a daily challenge with the same obstacle course for everyone, so that I can compare my performance with others informally.

#### Acceptance Criteria

1. THE Game SHALL display a Daily Challenge mode option on the start screen alongside the standard mode option
2. WHEN the Player selects Daily Challenge mode, THE Obstacle_Generator SHALL use a Daily_Seed derived from the current date in YYYY-MM-DD format to produce the same obstacle layout for all Players on the same calendar day
3. WHILE the Game is in Daily Challenge mode, THE Game SHALL display the current daily challenge date on screen during gameplay
4. WHEN the Player completes a Daily Challenge session, THE Game SHALL save the Player's best daily challenge score separately from the standard mode high score in localStorage
5. THE Game SHALL apply the same game rules, difficulty scaling, and mechanics in Daily Challenge mode as in standard mode

### Requirement 14: Offline PWA Support

**User Story:** As a Player, I want to install the Game on my device and play offline, so that I can enjoy it without an internet connection.

#### Acceptance Criteria

1. THE Game SHALL include a valid web app manifest containing the application name, icons, theme color, and display mode set to standalone
2. WHEN the Game loads for the first time, THE Service_Worker SHALL register and cache all static assets including HTML, JavaScript, CSS, and icon files
3. WHILE the Player's device has no internet connection and the Service_Worker has previously cached all assets, THE Game SHALL be fully playable offline
4. THE Game SHALL be installable on mobile devices, supporting the browser's native install prompt (such as Add to Home Screen or equivalent)
5. WHEN installed on a device, THE Game SHALL launch in standalone display mode without browser navigation chrome
6. WHEN the Player's device is online and a new version of the Game has been deployed, THE Service_Worker SHALL update the cached assets to reflect the latest version
