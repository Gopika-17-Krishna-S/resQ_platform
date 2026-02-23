1. Landing Page (Public Portal)
Theme: Dark mode, professional, high-urgency/utility aesthetic.
Color Palette: Dark Slate Blue (#0f172a), Primary Blue (#1d4ed8), Alert Red (#ef4444).

Layout Structure:

Navbar: Fixed top. Left: Logo ("resQ"). Right: Language selector (EN/ES), CTA Button (Red "EMERGENCY SOS").

Hero Section: Centered typography.

H1: "Rapid Response. When Seconds Count." (Blue highlight on second line).

Subtext: Grey, centered, max-width 600px.

Role Selection Grid: Three equal-width cards in a row.

Card 1 (Citizen): Icon (User), Title, Description, Input (Phone Number), Button (Blue "Login / Register").

Card 2 (Volunteer): Icon (Hand/Heart), Title, Description, Input (Volunteer ID), Button (Grey "Volunteer Login").

Card 3 (Command Center): Icon (Shield), Title, Description, Input (Official Email), Button (Grey "Admin Access").

Info Section (Bottom): Two-column layout.

Left: "How resQ Works" vertical list (Steps 1, 2, 3 with circular badges).

Right: "Get the Mobile App" dark card with App Store/Play Store badges.

Footer: Minimal copyright and links (Privacy, Terms, Support).

2. Admin Dashboard (Dispatcher View)
Theme: Command & Control, data-dense, dark UI.
Layout: Three-pane structure (Sidebar, Map Canvas, Floating Widgets).

Components:

Top Bar: Logo, Navigation Tabs (Dashboard [Active], Volunteers, Users), Notification Bell, Profile User.

Left Sidebar (Incident Feed):

Header: "Active Incidents" with "Live Feed" indicator. Filters (All, SOS, Reports).

Incident Cards: Vertical stack.

Selected Card: Expanded. Red "CRITICAL" badge. Details: Type (Cardiac Arrest), Location, Caller Name, Phone. Large "Assign Response" button (Blue).

Collapsed Cards: Summary view. Badges (High/Yellow, Medium/Orange). Type and Location.

Stats Footer: Pending (14), Resolved (8).

Center Canvas (Map): Dark map style.

Modal Overlay: "Deploy Assistance". Fields: Target Incident (Read-only), Nearest Volunteers list (User rows with status dots: Green/Online). Toggle: "Auto-dispatch enabled".

Bottom Right Widget: "Global Ops Chat". Collapsible header. Chat history bubbles (Blue for self, dark for others). Input field.

3. Citizen Interface (User Mobile/Web)
Theme: Map-centric, clean, accessible.
Layout: Full-screen map background with floating UI overlays.

Components:

Left Sidebar (Navigation): Glassmorphism/Dark pane.

Profile: Avatar and Level (e.g., "Citizen Level 1").

Menu Items: Dashboard (Active), Report Incident, My Requests, Chat, Notifications.

Bottom: Settings, Logout.

Map Layer: Dark base map. Markers: Fire icon (Red), Safe Zone (Green/Lock), User location (Blue pulse).

Top Right (Alerts): Stacked Toast Notifications.

Alert 1: Orange border. "Heavy Rain Alert" (Flash flood warning).

Alert 2: Blue border. "Nearest Safe Zone" (Directions link).

Bottom Left (Active Request): Floating Card.

Header: "Active Request".

Content: Icon (Medical), Status ("Responder Assigned"), ETA (5 mins).

Actions: "Details" (Grey), "Contact" (Blue).

Bottom Right (FAB): Large Red Circular Button ("SOS - PRESS 3S"). Small map control icons above it.

4. Volunteer Portal (Responder View)
Theme: Navigation-focused, task-oriented, high contrast.
Layout: Split view (Task List Left, Map Right).

Components:

Header: Logo, Title "Volunteer Portal", Status Toggle (Green "ONLINE"), Profile.

Left Panel (Task Manager):

Tabs: Assigned Tasks (2), Nearby Reports.

Active Card (Top): "Cardiac Emergency". Badge "RESPONDING" (Orange). Details: Distance, ETA, Medical Note ("65yo male..."). Actions: "Navigate" (Blue), "Update Status".

Pending Card (Bottom): "Structural Hazard". Badge "PENDING". Distance. Actions: "Accept Task" (Blue), "Reject".

Completed: Collapsed list at bottom.

Right Panel (Map Navigation):

Route UI: Dashed blue line path to destination.

Info Card (Top Left overlay): "Current Destination". Address, Time (4 min), Dist (0.8 mi), Arrival Time. "Start" button (Blue).

Map Controls: Zoom in/out, Re-center, Alert icon.

FAB: Chat bubble (Blue) with notification badge.