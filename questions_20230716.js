var questions = [
    "<b>What excites you about the future?</b> After setting your goals and outlining the steps, what are the things you're keen to explore, learn or do?",
  
    "<b>Assess your life's equilibrium.</b> List the major sectors of your life: family, work, finances, health, etc. Rank each on a scale of 1-10 based on the energy or effort it demands. Where is the bulk of your energy directed? Would you like to alter this balance?",

    "<b>Measure your advancement.</b> What's your process for tracking progress? What milestones have you set? Ensure you're on the right path and making strides towards your ultimate goal.",

    "<b>Start with minor changes for major impact.</b> Small daily actions accumulate over time like compound interest. What minor task or action can you initiate to gradually achieve your larger goal?",

    "<b>Equip yourself for achievement.</b> What are the essentials for you to flourish? This includes basic needs like food, water, sleep - are these sufficiently met? What else do you require? Perhaps solitude, nature, community, culture?",

    "<b>Utilize your unique strengths.</b> Identify your strong points. What are you exceptionally good at? How can you incorporate these strengths more into your daily life?",

    "<b>Confront your anxieties.</b> Think about the worst possible outcome. It's often more productive to face the reality than to avoid negative emotions. By dealing with your fears directly, you can take measures to prevent issues before they occur.",

    "<b>Define your mission.</b> Don't just complete tasks. Perform work that carries significance. Consider the person you aspire to be this week. How can your actions mirror your ambitions?",

    "<b>Go beyond the norm.</b> What extra steps can you take this week? Where can the extra effort create the most impact?",

    "<b>Seek others' viewpoints.</b> Who assists in improving your work? We all aim to succeed independently, but there's a lot to learn from others. This week, ask for feedback or work together with someone who can enhance your output.",

    "<b>Envision your achievement.</b> Keep your eyes on the goal. Amidst the daily grind, don't forget to take a step back to ensure you're still on track. What will the finish line look like? What actions do you need to take today to reach there?",
    
    "<b>Value progress over flawlessness.</b> At some point, getting things done is better than striving for perfection. Where do you need to press forward this week?",
    
    "<b>Draw inspiration from success stories.</b> Let other people's achievements motivate you. What lessons can you learn from their journeys? How can these insights be incorporated into your work?",

    "<b>Avoid isolating yourself.</b> Intense focus and hard work can sometimes feel isolating. Do you make time for social interactions? How can you enhance a relationship or cultivate a new one this week?",
    
    "<b>Take control.</b> Don't wait for others to grant you permission. Where do you wish to lead this week? How can you demonstrate leadership in your own life?",

    "<b>Wrap up pending tasks.</b> Perform a comprehensive check. What unfinished tasks need to be wrapped up? Often, we leave tasks hanging because they're difficult or because we avoid saying 'no'. Unburden yourself. Commit to your priorities and discard the rest.",
    
    "<b>Does your surrounding foster productivity?</b> Your environment impacts your output. Does your workspace stimulate creativity or suppress it? It should foster idea generation. What additions or removals are required to create such a space?",

    "<b>Accentuate the positive.</b> It's easy to notice the negatives. But what's going well? List down the positive aspects of your life and acknowledge your contribution to them.",

    "<b>Upgrade your toolkit.</b> Do you possess all the resources required for success? This could be anything from a sound sleep to the right gadget. If something isn't working well for you, how can you improve it?",

    "<b>Release what no longer benefits you.</b> Are you clinging onto things that no longer serve a purpose? This could range from outdated job duties to personal grievances, all of which occupy unnecessary space in your life. What can you let go of this week?",
    
    "<b>Cherish simple joys.</b> List activities that make you feel calm, focused, and happy. Make note of the little things that add a spark to your day. By committing to enjoy, you're likely to experience it more.",

    "<b>Maintain your focus.</b> It's easy to get distracted by other people's achievements or setbacks. Concentrate on your personal objectives and the reasons they hold significance to you. Unshackle yourself from the bonds of comparison.",

    "<b>Make your intentions tangible.</b> Triumph is subtle; it's its own spokesperson. What actions have you been planning, but haven't executed? Identify a task you can accomplish this week to transform your plans into reality.",
    
    "<b>Optimize your work process.</b> As an expert, a lot of tasks fall on your plate, potentially slowing down your progress. Where can you pass on responsibilities to ensure a smoother workflow?",
    
    "<b>Transform challenges into opportunities.</b> What if you looked at problems as potential to bring about innovation? Welcome every obstacle this week as a positive opportunity — a chance to rise to the challenge and display your best self.",
    
    "<b>Avoid running on empty.</b> Research highlights the importance of breaks for productivity, and the activities you engage in during breaks are significant. Activities such as outdoor walks boost cerebral blood flow; coloring promotes mindfulness. How can you replenish or maintain your energy each day?",

    "<b>Choose consciously.</b> Don't let your life run on autopilot. List your top priorities and personal values. When making a decision, ask yourself: how does this align with the individual I aspire to be?",

    "<b>Embrace open communication.</b> When we hit a roadblock, we often keep it to ourselves, but this can exacerbate the issue. This week, pledge to share your progress: the ups and downs. Instead of putting up a defense, seek help. Share your victories and strengthen your credibility. Foster a culture of transparent communication.",
    
    "<b>Establish a daily goal.</b> Your mindset has more control over your day than you might realize. Set a goal for your day — it could be an accomplishment you aim for, a mood you wish to cultivate, or anything that motivates you. By giving your day a purpose, you may view things from a new perspective and find more meaning in your actions.",
    
    "<b>Be a source of inspiration.</b> Who has inspired you to be your best self? How can you play that role for others? Sometimes, being a good listener or supporting someone's creative ideas can make a difference. Their triumphs become your triumphs.",
    
    "<b>Identify your tendencies.</b> Attempt to record your successes and hurdles every day for a week. Can you see any patterns? What insights can be gained by paying closer attention to your experiences?",
    
    "<b>Embody your desired feelings.</b> You have the utmost control over how you feel. If you're not content with your recent emotional state, what steps can you take to alter it?",
    
    "<b>Visualize your ideal day.</b> What would a perfect day look like for you? How can you contribute to making things go smoothly? Where can you incorporate flexibility? By having a clear image, you're more likely to attain the outcomes you desire.",
    
    "<b>Connect with your inner self.</b> What sparks your passion? What values steer your course? How can you celebrate and nurture the traits that make you uniquely you?",
    
    "<b>Amplify your credibility.</b> Actions are more powerful than words. What steps can you take this week to garner the respect of those around you?",
    
    "<b>Focus on quality over quantity.</b> Which tasks would benefit most from deep, focused attention this week? Instead of trying to do it all, choose a few tasks and execute them exceptionally well.",
    
    "<b>Amplify your impact.</b> Who is the most critical audience for your actions or words? How can you make what you do or say more meaningful to them?",
    
    "<b>You're capable, but prioritize.</b> The day only has so many hours. What are your main objectives? What deserves your focus, and what can you relinquish?",
    
    "<b>Cultivate gratitude.</b> Who are the people you're grateful for? What little things make your days special? Compile a list of the individuals, places, and things that you're thankful to have in your life.",

    "<b>Let your thoughts roam.</b> Pay heed to your daydreams and daily distractions. Note them down and look for common themes. You might stumble upon an idea seed that you can nurture into something significant.",

    "<b>Reflect on your daily journey.</b> We usually begin days with a plan, but how often do you reflect at the end of the day? Commit to spending 5-10 minutes each day to ponder over what went well, what was challenging, and any inspiring thoughts or people.",
    
    "<b>Simplify your environment.</b> Take a look around you. Are there items cluttering your workspace that hinder clear thinking or processes? How can you minimize distractions and create space for what you need most?",

    "<b>Address the small issues.</b> Small problems often remain unresolved because they seem insignificant, but consider how the time spent on small issues every day adds up over time. This week, resolve one small issue. You might be surprised at how it changes your perspective.",

    "<b>Carve out time for self-care.</b> A significant portion of our work is for others and on their timelines. This week, set aside some time exclusively for you. Whether it's a peaceful cup of coffee on a weekend morning or a day-long hike on your favorite trail, prioritize yourself.",
    
    ,"<b>Value your time.</b> Being fully immersed in your activities can enhance the results. This week, strive to be wholly present in every situation. Perhaps establish a closing ritual for the day to ensure a complete disconnect from work. This way, your work hours will be more productive."

    ,"<b>Break the pattern.</b> Repeating the same actions will yield the same results. Are there issues in your life that keep recurring? Think of 3 entirely different strategies to tackle them - you might stumble upon an innovative solution."
    
    ,"<b>Learn from your experiences.</b> What were the hurdles you faced this year? What lessons did they teach you?"
    
    ,"<b>Spread the joy of your achievements.</b> Success is a collective endeavor. Can you recall a recent accomplishment that was partly because of someone else's contribution? Did you express your gratitude? Spreading positivity and thankfulness boomerangs back to you."
    
    ,"<b>Understand what uplifts you.</b> Tune into your physical and emotional needs. What are the things that make you feel loved, supported, and content? How can you incorporate more of that into your week?"
    
    ,"<b>Acknowledge your triumphs.</b> Never-ending tasks can often overshadow your victories. If you do not take a moment to recognize your accomplishments, they might just fade away. Think of a recent achievement. Who can you celebrate it with? Why does it hold value?"
    
    ,"<b>Trust your instincts.</b> While making choices, we often lean on rationality. However, what does your instinct suggest? How would you feel about deciding based on your inner voice, rather than rational thinking?"
    
    ,"<b>Visualize and plan backwards.</b> Envision your life two decades from now. Your blueprint should indicate your end goal. Consider your current status. What single step can you take today to steer towards the life you aspire to lead?"
    
    ,"<b>The evolved you.</b> You have grown immensely this year. How do you compare to the person you were when you began this planner? How will your learnings this year shape your objectives and actions for the upcoming year?"

    // Chat GPT
    ,"<b>Pace Yourself.</b> Progress can be slow and steady. Don't discount the small victories that lead you to your overall goal."

    ,"<b>Self-care is Crucial.</b> Always find time for relaxation and restoration. It uplifts your physical health and mental wellbeing."
    
    ,"<b>Embrace Uncertainty.</b> Life can be unpredictable, yet these uncertainties often lead to the most beautiful outcomes. Embrace them."
    
    ,"<b>Let go of Perfection.</b> Perfection is an illusion. Instead of striving for it, aim for progress and continuous improvement."
    
    ,"<b>Seek Clarity.</b> Understand your purpose and intentions in every action. Clear purpose drives you to success."
    
    ,"<b>Stay Humble.</b> Humility opens doors to learning and growth. Never let success overshadow your humility."
    
    ,"<b>Forgiveness Heals.</b> Holding onto anger harms more than it helps. Forgive, not because they deserve it, but because you deserve peace."
    
    ,"<b>Consistency is Key.</b> Regular efforts, no matter how small, contribute significantly to achieving your goal."
    
    ,"<b>Never Stop Learning.</b> Expand your knowledge constantly. The more you learn, the more you grow."
    
    ,"<b>Take Responsible Risks.</b> Pushing boundaries often leads to great results. Learn to take calculated risks."
    
    ,"<b>Embrace Change.</b> Change is an integral part of growth. Embrace it with a positive mindset."
    
    ,"<b>Value Time.</b> Time is the one asset you can't get back. Use it wisely."
    
    ,"<b>Lead with Empathy.</b> Understand and share the feelings of others. It makes you a better leader and human."
    
    ,"<b>Cultivate Resilience.</b> Life will have ups and downs. Build your resilience to navigate through tough times."
    
    ,"<b>Trust your Instincts.</b> Sometimes, your gut feeling can guide you when logic can't. Trust it."
    
    ,"<b>Practice Mindfulness.</b> Living in the present moment reduces stress and improves mental health. Cultivate mindfulness."
    
    ,"<b>Speak Kindly.</b> Your words can lift someone up or tear them down. Choose to spread kindness."
    
    ,"<b>Listen Actively.</b> Listening is just as important as speaking. Practice active listening to truly understand others."
    
    ,"<b>Invest in Relationships.</b> Strong relationships are vital for a fulfilling life. Nurture your personal and professional relationships."
    
    ,"<b>Find Balance.</b> Maintaining a balance between various aspects of life is crucial for overall happiness and success."

]