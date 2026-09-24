# Inviting a CFI to review

A template for handing the review queue to a flight instructor. Kept in the repo so the second and third CFI get the same explanation as the first.

**Before you send it:**

1. Check the newest Vercel deployment says **Ready**. A link clicked before a deploy lands can stick as a 404 for that person.
2. Send the message. **Do not include the review link yet** — the account has to exist before you can grant access, and a reviewer who opens the link early sees "Nothing here for this account" and reasonably assumes it is broken.
3. When they tell you they have signed up and confirmed their email, run:

   ```sql
   update public.profiles set role = 'mentor'
   where lower(email) = 'their.email@example.com'
   returning email, role;
   ```

   One row reading `mentor`. **0 rows means they have not finished confirming** — the profile row does not exist until then.
4. Reply with the link. A **Review** link also appears in their dashboard header from then on, so they will not need to keep the email.

**Consider verifying their certificate number** against the FAA airman registry yourself. What they type into the app is self-declared, it is never checked, and it goes onto every row they approve — a record a school or a funder may read one day.

---

## The message

**Subject:** Would you review the ground-school questions before students see them?

Hello <name>,

I'm Demetrius Harris. I'm building PilotPathway.ai — an adaptive Private Pilot ground school for students aged 16 to 26 who are mostly first-generation, mostly cost-sensitive, and mostly new to airports. It's free to the students and it's a project of Equity Engine, a 501(c)(3).

The AI handles the tutoring and the progress tracking. It does not, and will not, decide what counts as correct. That's why I'm writing to you.

**What I'm asking.** I have 24 practice test questions and 144 lesson quiz cards written and waiting. **Not one of them is visible to a single student**, and none will be until a certificated flight instructor has approved it. I'd like that instructor to be you.

**Please read them as sceptically as you can.** They were drafted by an AI working from the FAA handbooks, the AIM, the regulations and the ACS — so the facts are mostly right and the errors are the quiet kind: a distractor that's defensible under some condition, an explanation that's true for one aeroplane and wrong in general, a stem with two answers a thoughtful student could argue for. None of those look wrong on the page. That's exactly what I need a human for.

**How it works.** You'll get a web page listing each question or card with its choices, the correct answer marked, the explanation, and what it was written from. Three buttons: **Approve**, **Send back**, or **Cut it**.

- **Approve** puts your name and certificate number against it. From that moment students can be asked it.
- **Send back** takes a note — tell me what's wrong and I fix it at the source, and it returns to your queue.
- **Cut it** means it isn't worth fixing.

You'll see two markers:

- **A gold panel saying a value needs confirming.** Those cards can't be approved at all — the Approve button is switched off. I wrote a placeholder rather than guess at a number. Put the figure you teach in the note and send it back. There are 22 of these.
- **A panel headed "Our own doubt about this card."** Something I wasn't sure about, written down for you. You can still approve it, but you'll be asked to answer the doubt in the note first, and your answer is kept on the record. There are 17.

**Time.** The 24 questions are one sitting, probably under an hour. The 144 cards are split by lesson so you can do a lesson at a time and pick up where you left off — the page shows how many are left. It works on a phone, though a laptop is easier.

**What I'm not asking.** This isn't an endorsement of any student, and nothing here substitutes for flight instruction. I'm asking you to check that what we teach on the ground is correct and that we aren't quietly lowering a standard.

One thing I'd ask you to hold me to: if you ever think we've softened an FAA standard to make it friendlier, say so plainly. Everything else about this project bends to the student. That part doesn't.

If you're willing, sign up at https://pilotpathway.vercel.app/signup and reply to let me know — I'll switch on your reviewer access and send you the link.

Thank you,

Demetrius D. Harris
demetrius@pilotpathway.ai
PilotPathway.ai — a project of Equity Engine
