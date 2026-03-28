-- Campaign state
CREATE TABLE IF NOT EXISTS campaign_state (
  id SERIAL PRIMARY KEY,
  campaign_start DATE NOT NULL,
  current_day INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Posts made by PayAgent
CREATE TABLE IF NOT EXISTS reddit_posts (
  id SERIAL PRIMARY KEY,
  day_number INTEGER NOT NULL,
  subreddit VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  reddit_post_id VARCHAR(20),
  posted_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'scheduled',
  upvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  last_checked TIMESTAMP
);

-- Comments detected on our posts
CREATE TABLE IF NOT EXISTS reddit_comments (
  id SERIAL PRIMARY KEY,
  reddit_comment_id VARCHAR(20) UNIQUE NOT NULL,
  post_id INTEGER REFERENCES reddit_posts(id),
  reddit_post_id VARCHAR(20),
  author VARCHAR(100),
  comment_text TEXT NOT NULL,
  detected_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending',
  proposed_reply TEXT,
  final_reply TEXT,
  replied_at TIMESTAMP,
  telegram_message_id INTEGER,
  is_sensitive BOOLEAN DEFAULT FALSE,
  sensitive_topic VARCHAR(100)
);

-- Persistent memory
CREATE TABLE IF NOT EXISTS payagent_memory (
  id SERIAL PRIMARY KEY,
  reddit_username VARCHAR(100),
  context_type VARCHAR(50),
  content TEXT NOT NULL,
  our_response TEXT,
  subreddit VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Blocked topics log
CREATE TABLE IF NOT EXISTS reddit_blocked_log (
  id SERIAL PRIMARY KEY,
  comment_id VARCHAR(20),
  author VARCHAR(100),
  topic_flagged VARCHAR(100),
  comment_text TEXT,
  flagged_at TIMESTAMP DEFAULT NOW()
);
