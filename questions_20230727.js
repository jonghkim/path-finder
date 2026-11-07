// Reflection prompts for the Notes › Question tab. Order matters: answers are stored by index
// (question-<i>-<date>), so edit wording in place and append new prompts at the end only.
var questions = [
    "<b>What are you looking forward to?</b> Beyond the deadlines, what do you actually want to explore, learn, or build next?",

    "<b>Where is your energy going?</b> Rate family, research, money, health, and friends from 1 to 10 by how much they take from you. Is that the balance you want?",

    "<b>How do you know you are moving?</b> What tells you a project is progressing, and when did you last check it against the real goal?",

    "<b>One small daily action.</b> Effort compounds. What is the smallest thing you could do every day that would add up to the result you want?",

    "<b>What do you need to do good work?</b> Sleep, food, movement, quiet, people, nature. Which of these is short right now, and what would fix it?",

    "<b>What are you unusually good at?</b> Name two strengths. How could your week use more of them?",

    "<b>What is the worst case?</b> Name the fear, then the actual worst outcome. What would you do the day after it happened?",

    "<b>Who are you trying to become this week?</b> Not what you need to finish. How should the way you work reflect that person?",

    "<b>Where would extra effort pay off most?</b> One place this week where going further than required changes the outcome.",

    "<b>Who makes your work better?</b> Whose feedback do you avoid asking for? Ask one person this week.",

    "<b>What does finished look like?</b> Describe the end state of your main project in two sentences. What today moves toward it?",

    "<b>Where is good enough better than perfect?</b> Which piece of work should ship this week instead of being polished again?",

    "<b>Whose path can you learn from?</b> Someone who did what you are trying to do. What did they do differently, and what can you borrow?",

    "<b>Are you isolating?</b> Deep work pulls you inward. Who have you not talked to in too long? One conversation this week.",

    "<b>Where are you waiting for permission?</b> What decision are you deferring to someone else that is actually yours to make?",

    "<b>What is still hanging?</b> List the unfinished things. Which ones get finished this week, and which ones get dropped on purpose?",

    "<b>Does your workspace help?</b> Desk, screen, noise, tabs. What one change would make it easier to think?",

    "<b>What is going well?</b> It is easy to list what is wrong. Name three things that are working and what you did to make them work.",

    "<b>What tool is slowing you down?</b> Software, hardware, a habit, a routine. What would fix it, and why have you not done it?",

    "<b>What can you let go of?</b> An obligation, a grudge, a project that is already dead. What are you still carrying that no longer serves you?",

    "<b>What small things make a day good?</b> List five. How many happened yesterday?",

    "<b>Whose race are you running?</b> Where has comparison crept into your goals? Restate one goal in terms that are only about you.",

    "<b>What have you been planning but not doing?</b> Pick one. What is the first concrete step, and when this week does it happen?",

    "<b>What should you not be doing yourself?</b> Which task on your plate could someone else do, or could be automated or dropped?",

    "<b>Which problem is actually an opening?</b> Take this week's biggest obstacle. What would it look like if it were an opportunity?",

    "<b>How do you refill?</b> What restores your energy on a normal workday, and is it on the calendar?",

    "<b>What do you value, really?</b> Name your top three. Does the way you spent the last week agree?",

    "<b>What are you keeping to yourself?</b> A stuck result, a slipped deadline, a worry. Who should hear it, and what happens if you say it this week?",

    "<b>What is today for?</b> One outcome, or one mood. If today achieves only that, it was a good day.",

    "<b>Who inspired you, and who are you inspiring?</b> What did they do? Where could you do the same for someone this week?",

    "<b>What patterns do you see?</b> Look at the last week of wins and stalls. What keeps repeating, and what does that tell you?",

    "<b>How do you want to feel?</b> If the last few weeks have not felt right, what one change would move the feeling, not just the schedule?",

    "<b>Describe a perfect ordinary day.</b> Wake-up to bedtime. What in that picture could you make true tomorrow?",

    "<b>What lights you up?</b> What work made you lose track of time recently? How do you get more of it?",

    "<b>What would earn respect this week?</b> Actions, not words. One thing you can do that people around you would notice.",

    "<b>What deserves your full attention?</b> Pick the two tasks that matter most this week. What do you have to say no to so they get done well?",

    "<b>Who is your real audience?</b> For your current paper or talk, who most needs to be convinced? What would make it land for them?",

    "<b>What gets your focus, and what gets dropped?</b> The day has limited hours. Name the two priorities, then name what you will consciously neglect.",

    "<b>Who and what are you grateful for?</b> People, places, small comforts. Write the list down. Tell one person on it.",

    "<b>Where does your mind wander?</b> Note this week's daydreams and distractions. Is there an idea hiding in them?",

    "<b>How did today go?</b> Five minutes at the end of the day: what worked, what was hard, what or who was inspiring.",

    "<b>What is cluttering your thinking?</b> Physical or digital. What can you remove to leave room for what matters?",

    "<b>Which small annoyance keeps costing you?</b> A broken script, a slow process, a missing file. Fix one this week.",

    "<b>When is time only yours?</b> Most of your hours belong to other people's timelines. Block one slot this week that is just for you.",

    "<b>Are you fully here?</b> Where were you half-present this week? What ritual would close the workday so it actually ends?",

    "<b>What keeps recurring?</b> A problem that comes back is a pattern, not bad luck. Write three completely different ways to break it.",

    "<b>What did this year teach you?</b> The hardest moments so far. What did each one leave you with?",

    "<b>Who shares credit for a recent win?</b> Did you thank them? Do it this week.",

    "<b>What makes you feel supported?</b> Physically and emotionally. What gives you that, and how do you get more of it into the week?",

    "<b>What did you accomplish recently?</b> It fades if you do not mark it. Name one win, why it matters, and who you can celebrate it with.",

    "<b>What does your gut say?</b> On the decision you are weighing now, set the reasoning aside. What does instinct suggest, and why?",

    "<b>Twenty years from now.</b> Picture the life. Where are you, and what are you doing? What single step today points toward it?",

    "<b>How have you changed?</b> Compare yourself to the person who started this year. What did you learn, and how does it change next year's goals?"
];
