# MVP Product Behavior Specification

## Overview

We are upgrading the platform to support coordinated event creation based on availability and venue approval.

The goal is to allow users to:

1. Select a date.
2. See which venues are available.
3. See which facilitators are available.
4. See how many community members are available.
5. Propose an event.
6. Require venue approval before publishing.
7. Only allow bookings for published events.

This document defines system behavior, not just database structure.

---

# Roles

There are four roles:

1. Member
2. Facilitator
3. Place Host (Owner or Manager)
4. Event Creator (any authenticated user)

A Place Host is any user linked to a place through place_hosts table.

---

# Event Creation Flow

Step 1:
A user selects a date and time.

Step 2:
System returns:
- List of places that have availability for that date and time.
- List of facilitators that marked themselves available that date.
- Count of community members who marked that date as available.

Step 3:
User selects:
- Place
- Optional facilitator
- Event title
- Description
- Time range

Step 4:
System creates an Event record with:

status = "proposed"
proposed_by = current user

The event is NOT bookable at this stage.

---

# Venue Approval

After an event is proposed:

- Any user linked to the selected place as owner or manager may approve it.
- On approval:
    - System checks for time conflict.
    - If conflict exists → reject approval.
    - If no conflict → status becomes "venue_approved".

At this stage:
Event still cannot accept bookings.

---

# Publishing

Only the event creator may publish.

Publishing is only allowed if:
event.status == "venue_approved"

On publish:
event.status = "published"

Only published events can accept bookings.

---

# Booking Rules

Before creating booking:

System must verify:
- event.status == "published"
- event.capacity not exceeded

If not valid → reject booking.

---

# Conflict Definition

An event conflicts if:

- Same place
- Same date
- Time ranges overlap
- Status IN ("venue_approved", "published")

Time overlap definition:

(start_time < existing.end_time)
AND (end_time > existing.start_time)

---

# State Transitions

Allowed transitions:

proposed → venue_approved
venue_approved → published
published → completed
published → cancelled
venue_approved → cancelled
proposed → cancelled

All other transitions must be rejected.

---

# Availability Behavior

Availability does NOT create events automatically.

Availability is only used for filtering during event creation.

Availability is NOT removed automatically when event is created.

Availability is advisory only.

---

# Non-Goals (Not In MVP)

- No facilitator approval requirement.
- No automated revenue splitting.
- No recurring availability patterns.
- No polling or voting logic.
- No dynamic entitlement gating.

---

End of specification.
