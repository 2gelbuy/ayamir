export interface HumorMessage {
  text: string;
  tone: 'polite' | 'default' | 'sarcastic';
  timing: '10min' | '5min' | '0min' | 'nudge';
  context?: string;
}

const humorMessages: HumorMessage[] = [
  // 10 minute reminders
  { text: '10 minutes until "{task}". The internet is infinite. Deadlines are not.', tone: 'default', timing: '10min' },
  { text: '"{task}" in 10 minutes. Time to prepare your winning mentality.', tone: 'default', timing: '10min' },
  { text: 'Start of "{task}" is near. Fear of missing a deadline is great motivation.', tone: 'default', timing: '10min' },
  { text: '10 minutes until "{task}". Coffee is cold, but is your enthusiasm still warm?', tone: 'polite', timing: '10min' },
  { text: 'Soon "{task}". Procrastination is not an excuse, but it is a good trend.', tone: 'sarcastic', timing: '10min' },
  { text: '10 minutes to "{task}". Your browser history will understand.', tone: 'sarcastic', timing: '10min' },
  { text: 'In 10 minutes: "{task}". Your future self is counting on present you.', tone: 'polite', timing: '10min' },

  // 5 minute reminders
  { text: '5 minutes until "{task}". The most harmful tab is the one open right now.', tone: 'default', timing: '5min' },
  { text: '"{task}" in 5 minutes. Last chance to pretend everything is under control.', tone: 'sarcastic', timing: '5min' },
  { text: 'Procrastination is over. "{task}" in 5 minutes.', tone: 'default', timing: '5min' },
  { text: '5 minutes. "{task}" won\'t disappear. Unlike time.', tone: 'default', timing: '5min' },
  { text: '"{task}" in 5 minutes. Surprise: it\'s still on the list.', tone: 'sarcastic', timing: '5min' },
  { text: '5 minutes left for "{task}". The universe believes in you. Mostly.', tone: 'default', timing: '5min' },
  { text: 'Final 5 minutes before "{task}". Deep breaths. You\'ve got this.', tone: 'polite', timing: '5min' },

  // Start time reminders
  { text: '"{task}" starts NOW. Surprise the world. At least your own.', tone: 'default', timing: '0min' },
  { text: 'Congratulations! You lived to "{task}". Now do it.', tone: 'sarcastic', timing: '0min' },
  { text: '"{task}" is waiting. It won\'t get angry, but karma will remember.', tone: 'default', timing: '0min' },
  { text: 'Time for "{task}". No excuses. Only actions.', tone: 'default', timing: '0min' },
  { text: '"{task}" now. Future you will thank present you.', tone: 'polite', timing: '0min' },
  { text: 'The moment has arrived. "{task}" awaits. Go be legendary.', tone: 'default', timing: '0min' },
  { text: 'It\'s "{task}" o\'clock! Time to make magic happen.', tone: 'polite', timing: '0min' },

  // Domain-specific nudges
  { text: '{domain} is a museum of distraction. The "Deadline" exhibit is in another hall.', tone: 'default', timing: 'nudge', context: 'general' },
  { text: 'YouTube knows everything. Except how to do "{task}" for you.', tone: 'default', timing: 'nudge', context: 'youtube.com' },
  { text: 'Social media can wait. "{task}" cannot. Simple math.', tone: 'default', timing: 'nudge', context: 'social' },
  { text: 'Reddit is a rabbit hole. "{task}" is your exit.', tone: 'default', timing: 'nudge', context: 'reddit.com' },
  { text: 'Videos will wait. "{task}" won\'t. Priorities, remember?', tone: 'polite', timing: 'nudge', context: 'youtube.com' },
  { text: 'Likes accumulate. Deadlines don\'t.', tone: 'default', timing: 'nudge', context: 'social' },
  { text: 'Instagram is infinity. "{task}" is reality.', tone: 'sarcastic', timing: 'nudge', context: 'instagram.com' },
  { text: 'r/procrastination is calling. But not now. Now is "{task}".', tone: 'sarcastic', timing: 'nudge', context: 'reddit.com' },
  { text: 'Twitter scrolls forever. "{task}" has a deadline.', tone: 'default', timing: 'nudge', context: 'twitter.com' },
  { text: 'Facebook memories are nice. "{task}" completion is nicer.', tone: 'polite', timing: 'nudge', context: 'facebook.com' },
  { text: 'TikTok dances can wait. "{task}" can\'t.', tone: 'sarcastic', timing: 'nudge', context: 'tiktok.com' },
  { text: 'LinkedIn networking is important. "{task}" completion is more important.', tone: 'polite', timing: 'nudge', context: 'linkedin.com' },
  { text: 'Netflix will autoplay the next episode. "{task}" won\'t.', tone: 'default', timing: 'nudge', context: 'netflix.com' },
  { text: 'Amazon has one-click buying. "{task}" needs one-click doing.', tone: 'sarcastic', timing: 'nudge', context: 'amazon.com' },
  { text: 'Gmail has infinite scroll. "{task}" has a finite deadline.', tone: 'default', timing: 'nudge', context: 'mail.google.com' },
  { text: 'News websites refresh constantly. "{task}" deadlines don\'t.', tone: 'polite', timing: 'nudge', context: 'news' },

  // Time of day context
  { text: 'Coffee consumed? Then "{task}" awaits.', tone: 'polite', timing: '10min', context: 'morning' },
  { text: 'Morning is the time of opportunities. Start with "{task}".', tone: 'polite', timing: '0min', context: 'morning' },
  { text: 'The early bird gets the worm. The focused bird gets "{task}" done.', tone: 'default', timing: '5min', context: 'morning' },
  { text: 'Breakfast is served. Now for "{task}" as the main course.', tone: 'polite', timing: '0min', context: 'morning' },
  
  { text: 'After lunch everyone is a genius. Prove it with "{task}".', tone: 'default', timing: '5min', context: 'afternoon' },
  { text: 'Day is in full swing. "{task}" is also waiting for its moment.', tone: 'polite', timing: '10min', context: 'afternoon' },
  { text: 'The afternoon slump is real. "{task}" completion is the cure.', tone: 'default', timing: '0min', context: 'afternoon' },
  { text: 'Lunch is digested. Time to digest "{task}" instead.', tone: 'sarcastic', timing: '5min', context: 'afternoon' },
  
  { text: '"{task}" at midnight is style or procrastination?', tone: 'sarcastic', timing: '0min', context: 'night' },
  { text: 'Evening is not a reason to postpone "{task}".', tone: 'default', timing: '5min', context: 'evening' },
  { text: 'The night is young and so is your "{task}" deadline.', tone: 'default', timing: '10min', context: 'evening' },
  { text: 'Dinner is done. Dessert is "{task}" completion.', tone: 'polite', timing: '0min', context: 'evening' },
  { text: 'The moon is watching. Will it see you do "{task}"?', tone: 'sarcastic', timing: '5min', context: 'night' },

  // General nudges
  { text: 'Distraction is easy. Doing "{task}" is legendary.', tone: 'default', timing: 'nudge', context: 'general' },
  { text: 'The internet will still be here after "{task}". Probably.', tone: 'sarcastic', timing: 'nudge', context: 'general' },
  { text: 'Your focus is a superpower. Use it on "{task}".', tone: 'polite', timing: 'nudge', context: 'general' },
  { text: 'This website is a black hole. "{task}" is your escape rope.', tone: 'default', timing: 'nudge', context: 'general' },
  { text: 'Future you wants present you to finish "{task}". Listen to future you.', tone: 'polite', timing: 'nudge', context: 'general' },
  { text: 'The tab you\'re on won\'t love you back. "{task}" will.', tone: 'sarcastic', timing: 'nudge', context: 'general' },

  // Day of week context
  { text: 'Monday motivation: Start strong with "{task}".', tone: 'polite', timing: '0min', context: 'monday' },
  { text: 'Hump day hurdle: Clear "{task}" to get over it.', tone: 'default', timing: '5min', context: 'wednesday' },
  { text: 'Thankfully, it\'s Friday. Thankful you can finish "{task}".', tone: 'polite', timing: '10min', context: 'friday' },
  { text: 'Weekend warrior? "{task}" stands between you and glory.', tone: 'default', timing: '0min', context: 'friday' },
  { text: 'Sunday scaries are real. "{task}" completion helps.', tone: 'polite', timing: '5min', context: 'sunday' },

  // Weather context (placeholder for future integration)
  { text: 'Rainy day? Perfect weather for "{task}" productivity.', tone: 'polite', timing: 'nudge', context: 'rainy' },
  { text: 'Sunny outside? "{task}" completion will make it brighter.', tone: 'default', timing: 'nudge', context: 'sunny' },
  { text: 'Stormy weather? "{task}" is your shelter from procrastination.', tone: 'sarcastic', timing: 'nudge', context: 'stormy' }
];

let recentMessages: string[] = [];
const MAX_RECENT = 5;

export const getHumorMessage = (
  tone: 'polite' | 'default' | 'sarcastic',
  timing: '10min' | '5min' | '0min' | 'nudge',
  taskName: string,
  domain?: string
): string => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  let timeContext: string | undefined;
  let dayContext: string | undefined;

  // Time of day context
  if (hour >= 5 && hour < 12) timeContext = 'morning';
  else if (hour >= 12 && hour < 17) timeContext = 'afternoon';
  else if (hour >= 17 && hour < 21) timeContext = 'evening';
  else timeContext = 'night';

  // Day of week context
  if (dayOfWeek === 1) dayContext = 'monday';
  else if (dayOfWeek === 3) dayContext = 'wednesday';
  else if (dayOfWeek === 5) dayContext = 'friday';
  else if (dayOfWeek === 0 || dayOfWeek === 6) dayContext = 'weekend';
  else if (dayOfWeek === 6) dayContext = 'saturday';
  else if (dayOfWeek === 0) dayContext = 'sunday';

  // Domain context
  let domainContext: string | undefined;
  if (domain) {
    if (domain.includes('youtube.com')) domainContext = 'youtube.com';
    else if (domain.includes('reddit.com')) domainContext = 'reddit.com';
    else if (domain.includes('instagram.com')) domainContext = 'instagram.com';
    else if (domain.includes('facebook.com')) domainContext = 'facebook.com';
    else if (domain.includes('twitter.com')) domainContext = 'twitter.com';
    else if (domain.includes('tiktok.com')) domainContext = 'tiktok.com';
    else if (domain.includes('linkedin.com')) domainContext = 'linkedin.com';
    else if (domain.includes('netflix.com')) domainContext = 'netflix.com';
    else if (domain.includes('amazon.com')) domainContext = 'amazon.com';
    else if (domain.includes('mail.google.com')) domainContext = 'mail.google.com';
    else if (domain.includes('news') || domain.includes('cnn.com') || domain.includes('bbc.com')) domainContext = 'news';
    else if (domain.includes('facebook.com') || domain.includes('twitter.com') || domain.includes('instagram.com')) domainContext = 'social';
  }

  const candidates = humorMessages.filter(msg => {
    if (msg.tone !== tone && msg.tone !== 'default') return false;
    if (msg.timing !== timing) return false;

    if (timing === 'nudge' && msg.context) {
      // Check for domain-specific messages first
      if (domainContext && (msg.context === domainContext)) return true;
      // Then check for day-specific messages
      if (dayContext && (msg.context === dayContext)) return true;
      // Then check for time-specific messages
      if (timeContext && (msg.context === timeContext)) return true;
      // Finally check for general messages
      if (msg.context === 'general') return true;
      return false;
    }

    // For non-nudge messages, check for time or day context
    if (msg.context) {
      if (msg.context === timeContext) return true;
      if (msg.context === dayContext) return true;
      if (msg.context === 'general') return true;
      return false;
    }

    return true;
  });

  const availableMessages = candidates.filter(msg => !recentMessages.includes(msg.text));
  const pool = availableMessages.length > 0 ? availableMessages : candidates;

  const selected = pool[Math.floor(Math.random() * pool.length)];

  recentMessages.push(selected.text);
  if (recentMessages.length > MAX_RECENT) {
    recentMessages.shift();
  }

  let message = selected.text.replace('{task}', taskName);
  if (domain) {
    message = message.replace('{domain}', domain);
  }

  return message;
};
