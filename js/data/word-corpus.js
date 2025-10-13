/**
 * Word Corpus - 5th grade level vocabulary organized by difficulty
 * Progresses from home keys to harder key positions
 */

const WordCorpus = {
    // Home row letters only (asdf jkl;)
    homeKeys: {
        letters: ['a', 's', 'd', 'f', 'j', 'k', 'l'],

        twoLetter: [
            'as', 'ad', 'la', 'ka', 'fa', 'sa'
        ],

        threeLetter: [
            'dad', 'sad', 'lad', 'fad', 'ask', 'add', 'all', 'fall'
        ],

        fourLetter: [
            'fall', 'hall', 'salad', 'flask', 'shall', 'small'
        ],

        words: [
            'dad', 'sad', 'lad', 'fad', 'ask', 'add', 'all',
            'fall', 'hall', 'flask', 'shall', 'small', 'salad'
        ]
    },

    // Home row + top row (qwert yuiop)
    easyKeys: {
        letters: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],

        shortWords: [
            // 2-3 letters
            'we', 'up', 'it', 'to', 'is', 'at', 'or', 'so',
            'the', 'you', 'are', 'for', 'was', 'all', 'day',
            'had', 'her', 'how', 'its', 'our', 'out', 'way',
            'who', 'oil', 'use', 'two', 'did', 'sit', 'set',
            'put', 'end', 'why', 'try', 'let', 'old', 'run',
            'top', 'fly', 'sky', 'dry', 'yet', 'red', 'hot'
        ],

        mediumWords: [
            // 4-5 letters
            'that', 'with', 'have', 'this', 'will', 'your',
            'from', 'they', 'said', 'what', 'their', 'would',
            'make', 'like', 'time', 'just', 'know', 'take',
            'year', 'work', 'back', 'call', 'hand', 'part',
            'over', 'after', 'little', 'help', 'line', 'turn',
            'much', 'mean', 'before', 'move', 'right', 'think',
            'same', 'tell', 'does', 'well', 'also', 'play',
            'small', 'home', 'read', 'port', 'large', 'spell',
            'even', 'such', 'kind', 'high', 'keep', 'still',
            'start', 'light', 'house', 'story', 'point', 'world',
            'build', 'earth', 'stand', 'found', 'study', 'learn',
            'should', 'write', 'answer', 'school', 'grow', 'found',
            'under', 'while', 'above', 'something', 'thought', 'together'
        ]
    },

    // All keys - full keyboard
    allKeys: {
        shortWords: [
            // Common 2-4 letter words for 5th graders
            'can', 'big', 'box', 'fix', 'mix', 'six', 'zip',
            'zoo', 'yes', 'new', 'now', 'man', 'get', 'has',
            'him', 'into', 'see', 'make', 'go', 'come', 'made',
            'may', 'part', 'over', 'new', 'name', 'very', 'man',
            'back', 'call', 'came', 'before', 'form', 'three',
            'want', 'air', 'good', 'me', 'give', 'most', 'us'
        ],

        mediumWords: [
            // Common 5-7 letter words
            'about', 'after', 'again', 'animal', 'another', 'answer',
            'around', 'because', 'before', 'between', 'children', 'different',
            'during', 'enough', 'example', 'family', 'follow', 'important',
            'Indian', 'kitchen', 'letter', 'listen', 'making', 'meaning',
            'mother', 'nothing', 'number', 'other', 'paper', 'people',
            'person', 'picture', 'place', 'problem', 'question', 'really',
            'school', 'second', 'sentence', 'several', 'should', 'simple',
            'special', 'started', 'story', 'student', 'talking', 'teacher',
            'things', 'think', 'through', 'together', 'turned', 'usually',
            'walking', 'wanted', 'water', 'where', 'which', 'winter',
            'without', 'wonder', 'working', 'writing', 'yellow', 'yesterday'
        ],

        longWords: [
            // Common 8+ letter words (but still 5th grade level)
            'beautiful', 'beginning', 'breakfast', 'butterfly', 'celebrate',
            'chocolate', 'classroom', 'community', 'computer', 'confused',
            'dangerous', 'definitely', 'delicious', 'different', 'dinosaur',
            'disappear', 'elephant', 'everyone', 'everything', 'excellent',
            'exciting', 'exercise', 'favorite', 'february', 'football',
            'friendly', 'frighten', 'hamburger', 'happiness', 'hospital',
            'important', 'interested', 'invisible', 'kitchen', 'language',
            'laughter', 'lightning', 'listening', 'mountain', 'necessary',
            'neighbor', 'november', 'opposite', 'ordinary', 'outside',
            'paragraph', 'peaceful', 'perfectly', 'photograph', 'playground',
            'pumpkin', 'question', 'rainbow', 'remember', 'restaurant',
            'sandwich', 'saturday', 'scientist', 'september', 'something',
            'sometimes', 'strawberry', 'suddenly', 'summer', 'sunshine',
            'surprise', 'swimming', 'telephone', 'television', 'terrible',
            'thanksgiving', 'thursday', 'together', 'tomorrow', 'tonight',
            'triangle', 'umbrella', 'understand', 'vegetable', 'wednesday',
            'weekend', 'whatever', 'whenever', 'wonderful', 'yesterday'
        ]
    },

    // Get words for specific difficulty level
    getWords(difficulty, keySet = 'homeKeys') {
        switch(keySet) {
            case 'homeKeys':
                switch(difficulty) {
                    case 'letters': return this.homeKeys.letters;
                    case 'short': return this.homeKeys.twoLetter.concat(this.homeKeys.threeLetter);
                    case 'medium': return this.homeKeys.fourLetter.concat(this.homeKeys.words);
                    default: return this.homeKeys.words;
                }

            case 'easyKeys':
                switch(difficulty) {
                    case 'letters': return this.easyKeys.letters;
                    case 'short': return this.easyKeys.shortWords;
                    case 'medium': return this.easyKeys.mediumWords;
                    default: return this.easyKeys.shortWords.concat(this.easyKeys.mediumWords);
                }

            case 'allKeys':
            default:
                switch(difficulty) {
                    case 'short': return this.allKeys.shortWords;
                    case 'medium': return this.allKeys.mediumWords;
                    case 'long': return this.allKeys.longWords;
                    case 'mixed':
                        // Mix of all lengths for variety
                        return [
                            ...this.allKeys.shortWords,
                            ...this.allKeys.mediumWords,
                            ...this.allKeys.longWords.slice(0, 20) // Just some long ones
                        ];
                    default: return this.allKeys.mediumWords;
                }
        }
    }
};

window.WordCorpus = WordCorpus;