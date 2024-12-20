const translations = {
    title: "✨ EasyComment",
    ratingLabel: "Your Rating",
    generateButton: "Generate Comment",
    loading: "Generating smart comment...",
    confirmButton: "Post Comment",
    selectRating: "Please select a rating.",
    goToYoutube: "Please go to a YouTube video page.",
    error: "An error occurred. Please try again.",
    success: "Comment was successfully placed in the comments field.",
    previewButton: "Preview Comment",
    comments: {
        1: [
            "Unfortunately, this content didn't meet my expectations 😕",
            "The quality could have been much better",
            "This video needs significant improvement",
            "The content lacked depth and substance",
            "Not what I was hoping for, quite disappointing",
            "The presentation was hard to follow",
            "The information wasn't very well organized",
            "This could use more research and preparation",
            "The content feels rushed and incomplete",
            "Missing important details and context",
            "The production value needs significant work",
            "This content falls short of basic standards",
            "The material wasn't properly researched",
            "Struggled to find value in this content",
            "The presentation lacks professional quality",
            "Important topics were overlooked",
            "The delivery needs major improvement",
            "Not enough attention to detail",
            "The content seems unfinished",
            "The explanations are confusing",
            "Would benefit from better examples",
            "The pacing is off throughout",
            "Key concepts are poorly explained",
            "The structure needs complete revision",
            "Missing crucial information",
            "The approach seems unprofessional",
            "Too many inaccuracies to be useful",
            "The quality is below expectations",
            "Needs a complete overhaul",
            "The content is too superficial",
            "The content needs better fact-checking",
            "The audio quality is subpar",
            "Difficult to follow the main points",
            "The visuals need improvement",
            "Not enough supporting evidence",
            "The arguments are poorly constructed",
            "Too many distracting elements",
            "The content feels disorganized",
            "Lacks coherent structure",
            "The examples are confusing",
            "Could use better editing",
            "The points aren't well connected",
            "Missing essential context",
            "The presentation is hard to follow",
            "Needs more thorough planning",
            "The quality is inconsistent",
            "Too many technical issues",
            "The content feels rushed",
            "Poor attention to detail",
            "The delivery is unconvincing",
            "The narrative lacks coherence",
            "Sources need to be verified",
            "The content seems hastily made",
            "Presentation needs restructuring",
            "Too many unexplained concepts",
            "The quality is below standard",
            "Requires substantial revision",
            "The flow is very choppy",
            "Important points are missing",
            "The editing is quite rough",
            "Explanations are too vague",
            "The content feels amateur",
            "Needs better preparation",
            "The delivery is monotonous",
            "Technical aspects need work",
            "Arguments aren't convincing",
            "The pacing is problematic",
            "Lacks essential elements",
            "The structure is confusing",
            "Production value is low",
            // ... 90 more similar negative but constructive comments ...
        ],
        2: [
            "It's okay, but there's definitely room for improvement 🤔",
            "Some good points, but needs more development",
            "The content is basic but somewhat helpful",
            "Average content, could be more detailed",
            "Decent attempt but missing key information",
            "The presentation needs more polish",
            "Good concept, weak execution",
            "Could benefit from better organization",
            "Somewhat informative but lacks depth",
            "Has potential but needs refinement",
            "Mediocre content with potential",
            "Needs more thorough research",
            "The presentation could be clearer",
            "Basic information but lacks depth",
            "Some points need better explanation",
            "Could use more practical examples",
            "The content feels incomplete",
            "Moderate effort but needs work",
            "The delivery needs improvement",
            "Average quality, nothing special",
            "More detail would help",
            "The structure needs work",
            "Some good ideas, poor execution",
            "Requires better organization",
            "The pacing could be improved",
            "Missing some important details",
            "The content is too basic",
            "Needs more professional polish",
            "The examples aren't very helpful",
            "Could be more engaging",
            "Shows promise but needs work",
            "The content is somewhat unclear",
            "Could use better examples",
            "Needs more thorough editing",
            "The pacing is inconsistent",
            "Basic but not comprehensive",
            "The explanations are too brief",
            "Requires more depth",
            "The structure is confusing",
            "Missing important context",
            "The delivery is uneven",
            "Could be more focused",
            "Needs better transitions",
            "The content feels scattered",
            "More research would help",
            "The presentation is rough",
            "Lacks professional polish",
            "The examples are too simple",
            "Could be more organized",
            "Needs better flow",
            "Has potential but underwhelming",
            "Needs more polished delivery",
            "The content is too shallow",
            "Could use better planning",
            "Explanations need clarity",
            "Average production quality",
            "Missing key information",
            "The flow needs improvement",
            "Content feels underdeveloped",
            "Requires better examples",
            "The pace is uneven",
            "More detail would help",
            "Presentation lacks focus",
            "Basic but needs refinement",
            "Could be more coherent",
            "Needs better structure",
            "The delivery is stiff",
            "Content feels incomplete",
            "More depth is needed",
            "Organization needs work",
            // ... 90 more similar slightly negative comments ...
        ],
        3: [
            "Decent video, thanks for sharing 👍",
            "Pretty good content overall",
            "Nice effort, keep developing your content",
            "Solid information, room to grow",
            "Good points were made here",
            "Helpful content for beginners",
            "Reasonable explanation of the topic",
            "Clear and straightforward presentation",
            "Useful information for the most part",
            "Satisfactory content and delivery",
            "Good effort on this topic",
            "Fairly informative content",
            "Decent overview of the subject",
            "Adequate explanation overall",
            "Not bad, room for improvement",
            "Generally helpful information",
            "Solid basics covered here",
            "Reasonable presentation style",
            "Good starting point for beginners",
            "Meets basic expectations",
            "Useful introduction to the topic",
            "Clear enough to follow along",
            "Average but informative",
            "Decent production quality",
            "Gets the main points across",
            "Satisfactory explanation",
            "Good foundation material",
            "Competent presentation",
            "Helpful for basic understanding",
            "Worth watching for basics",
            "Reasonably well-presented",
            "Good effort overall",
            "Decent information shared",
            "Adequate coverage of topics",
            "Fair presentation style",
            "Solid basic information",
            "Generally well-structured",
            "Useful content overall",
            "Satisfactory explanation",
            "Good starting material",
            "Clear enough to understand",
            "Decent production value",
            "Reasonable approach taken",
            "Helpful information provided",
            "Good foundational content",
            "Competent delivery style",
            "Useful learning resource",
            "Adequate depth of coverage",
            "Solid presentation overall",
            "Worth the viewing time",
            "Decent effort and execution",
            "Good basic information",
            "Reasonably well done",
            "Solid foundational content",
            "Adequate presentation style",
            "Generally informative",
            "Clear enough to follow",
            "Useful basic content",
            "Fair and balanced approach",
            "Good starting information",
            "Competent explanation",
            "Satisfactory overview",
            "Reasonable content flow",
            "Helpful introduction",
            "Decent production work",
            "Good learning material",
            "Solid presentation",
            "Worth considering",
            "Adequate coverage",
            "Useful resource",
            // ... 90 more similar neutral-positive comments ...
        ],
        4: [
            "Really useful content! Great work 👏",
            "Excellent presentation and information",
            "Very well-structured and informative",
            "Thoroughly enjoyed this content",
            "Great explanation of the topic",
            "Very helpful and well-presented",
            "Impressive content and delivery",
            "Well-researched and informative",
            "Clear, concise, and valuable",
            "Outstanding work on this video",
            "Excellent content delivery",
            "Very professional presentation",
            "High-quality information shared",
            "Really well-researched content",
            "Great depth of knowledge shown",
            "Thoroughly enjoyable watch",
            "Very comprehensive coverage",
            "Expertly explained concepts",
            "Impressive attention to detail",
            "Highly informative content",
            "Well-structured presentation",
            "Great examples throughout",
            "Very engaging delivery",
            "Excellent production value",
            "Strong technical content",
            "Very well-organized material",
            "Great practical examples",
            "Highly professional quality",
            "Outstanding explanations",
            "Valuable insights shared",
            "Very well-executed content",
            "Great attention to detail",
            "Excellent explanations",
            "Highly informative material",
            "Very professional approach",
            "Strong technical knowledge",
            "Well-researched presentation",
            "Great practical insights",
            "Very engaging content",
            "Excellent teaching style",
            "High-quality production",
            "Very thorough coverage",
            "Great depth of information",
            "Well-structured material",
            "Very clear explanations",
            "Impressive content quality",
            "Excellent learning resource",
            "Very helpful examples",
            "Great presentation skills",
            "Highly valuable content",
            "Very insightful content",
            "Excellent presentation flow",
            "Well-crafted material",
            "Great educational value",
            "Strong content structure",
            "Very effective delivery",
            "High-quality production",
            "Impressive detail level",
            "Well-thought-out content",
            "Great learning resource",
            "Very clear explanations",
            "Professional approach",
            "Excellent organization",
            "Strong technical detail",
            "Very engaging material",
            "Well-executed content",
            "Great teaching style",
            "Highly informative",
            "Excellent examples",
            "Very well researched",
            "Outstanding achievement! 🏆",
            "Pure excellence! 🌟",
            "Phenomenal content! 💫",
            "Absolutely perfect! 🎯",
            "Masterful creation! 👑",
            "Exceptional quality! 💎",
            "Brilliant execution! ⭐",
            "Revolutionary content! ⚡",
            "Magnificent work! 🌠",
            "Extraordinary delivery! 🎭",
            "Spectacular content! 🌈",
            "Perfect presentation! 💫",
            "Incredible quality! ⭐",
            "Outstanding expertise! 🏅",
            "Brilliant masterpiece! 🎊",
            "Exceptional work! 💫",
            "World-class content! ✨",
            "Simply outstanding! 🌟"
            // ... 90 more similar positive comments ...
        ],
        5: [
            "Absolutely outstanding! One of the best videos on this topic ⭐️🌟",
            "Exceptional content, incredibly well done!",
            "This is exactly what I was looking for, perfect!",
            "Brilliant explanation and presentation",
            "Top-tier content, extremely helpful",
            "Masterfully created and presented",
            "This sets the standard for quality content",
            "Phenomenal work, incredibly detailed",
            "Outstanding quality and information",
            "Superb content, couldn't be better",
            "Absolutely incredible content! Best in class! 🏆",
            "Mind-blowing quality and presentation! 💫",
            "This is pure gold! Thank you so much! 🌟",
            "Exceptional work, beyond expectations! ⭐",
            "Revolutionary content, absolutely perfect! 🎯",
            "This is what excellence looks like! 💎",
            "Masterpiece of educational content! 👑",
            "Incredible value and perfect delivery! 🔥",
            "Outstanding in every possible way! ✨",
            "This sets a new standard for quality! 🌠",
            "Absolutely world-class content! 🏅",
            "Phenomenal work, simply the best! 🎊",
            "Extraordinary quality throughout! 🌈",
            "Perfect in every aspect! 💫",
            "Revolutionary approach to the topic! ⚡",
            "Magnificent presentation and content! 🎭",
            "Truly exceptional work! 🎯",
            "Brilliant from start to finish! 🌟",
            "Absolutely flawless content! ⭐",
            "Simply magnificent! 💫",
            "Absolutely incredible work! 🌟",
            "Perfect explanation and delivery! 💫",
            "Outstanding quality content! ⭐",
            "Masterful presentation! 🏆",
            "Exceptional educational value! 💎",
            "Brilliant work throughout! ✨",
            "Phenomenal content creation! 🔥",
            "Absolutely top-tier material! 👑",
            "Incredible depth and quality! 🌠",
            "Revolutionary teaching approach! ⚡",
            "Magnificent educational content! 🎯",
            "Extraordinary presentation skills! 🎭",
            "Superb quality throughout! 🌈",
            "Perfect educational resource! 💫",
            "Brilliant execution all around! ⭐",
            "Outstanding in every way! 🏅",
            "Masterpiece of teaching! 🎊",
            "Exceptional quality content! 💫",
            "Absolutely brilliant work! 💯",
            "Incredible masterpiece! ✨",
            "Outstanding achievement! 🏆",
            "Pure excellence! 🌟",
            "Phenomenal content! 💫",
            "Absolutely perfect! 🎯",
            "Masterful creation! 👑",
            "Exceptional quality! 💎",
            "Brilliant execution! ⭐",
            "Revolutionary content! ⚡",
            "Magnificent work! 🌠",
            "Extraordinary delivery! 🎭",
            "Spectacular content! 🌈",
            "Perfect presentation! 💫",
            "Incredible quality! ⭐",
            "Outstanding expertise! 🏅",
            "Brilliant masterpiece! 🎊",
            "Exceptional work! 💫",
            "World-class content! ✨",
            "Simply outstanding! 🌟"
            // ... 90 more similar very positive comments ...
        ]
    }
};