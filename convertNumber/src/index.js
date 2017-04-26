// TODO: Implement UK and DE languages: invocation name, translations
// TODO: Note that only whole numbers can be converted. No decimals.

const SKILL_NAME = 'Radix Converter';
const VERSION_NUMBER = '1.0';

const Alexa = require('alexa-sdk');

const APP_ID = 'amzn1.ask.skill.8be445be-41c4-46d4-9169-a7e9d03b1089'; // TODO replacewith your app ID (OPTIONAL)

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context);

    // alexa.dynamoDBTableName = 'YourTableName'; // creates new table for userid:session.attributes

    //alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

//
//  ERROR, STATUS, and CONSTANTS
//

// Codes for representing base order
const BASE_CODE = {
    PRE: 1,
    POST: 2,
    TEMP: 3
};

// Codes for missing bases
const BASE_STATUS_CODE = {
    ALL_BASES_PRESENT: 0,
    NO_PREBASE: -1,
    NO_POSTBASE: -2,
    ALL_BASES_ABSENT: -3
};

// Error codes for conversion
const ERROR_CODE = {
    INPUT_BASE_NOT_SUPPORTED: -1,   // base is outside [2, 36]
    INPUT_DECIMAL: -2,              // contains point value
    INPUT_NEGATIVE: -4,             // must be positive
    INPUT_INVALID: -8,              // contains incompatible number and base pairings
    INPUT_INVALID_BASE_ORDER: -16,   // base order is not in custom slot type list

    STOP: -4096
};

// Error string output for user
const ERROR_STRINGS = {
    INPUT_BASE_NOT_SUPPORTED: 'Please provide a base betweeen 2 and 36.',
    INPUT_DECIMAL: 'Please provide a number without a point value.',
    INPUT_NEGATIVE: 'Please provide a positive number.',
    INPUT_INVALID: 'Please provide a valid number and base pairing.',
    INPUT_INVALID_BASE_ORDER: 'Please say if the base you provided is for the original number, or the converted number.',

    UNHANDLED_EXCEPTION: 'An unexpected error occured. Please try again.'
};

// Prompt codes to store history of prompts asked
const PROMPT_CODE = {
    WELCOME: 0,
    NUMBER_INPUT: -1,
    BASE_INPUT: -2,
    PRE_BASE_INPUT: -3,
    POST_BASE_INPUT: -4,
    BASE_ORDER_INPUT: -5,
    BOTH_BASE_INPUT: -6,
    COMPLETE_INPUT: -7,
    NUM_BASE_INPUT: -8,
    VALIDATE_INPUT: -9,

    PROMPT_NUMBER_HELPER: -11,
    PROMPT_PREBASE_HELPER: -12,
    PROMPT_POSTBASE_HELPER: -13,
    PROMPT_BASE_ORDER_HELPER: -14,
    
    PROVIDE_FINAL_RESULT_HELPER: -100, 

    ERROR_PROMPT_BASE_INPUT_HELPER: -101,
    ERROR_PROMPT_BASE_ORDER_INPUT_HELPER: -102,
    ERROR_PROMPT_NUMBER_INPUT_HELPER: -103,
    ERROR_PROMPT_INVALID_INPUT: -104,

    UNHANDLED_EXCEPTION: -404,

    AMAZON_HELP_INTENT: -1001,
    AMAZON_STOP_INTENT: -1002,
    AMAZON_CANCEL_INTENT: -1003,
};

// Input codes to store user input history
const INPUT_CODE = {
    LAUNCH: 0,
    NUMBER: -1,
    BASE: -2,
    PRE_BASE: -3,
    POST_BASE: -4,
    BASE_ORDER: -5,
    NUM_PRE_BASE: -6,
    NUM_POST_BASE: -7,
    BOTH_BASE: -8,
    COMPLETE: -9,

    UNHANDLED: -404,

    AMAZON_HELP_INTENT: -1001,
    AMAZON_STOP_INTENT: -1002,
    AMAZON_CANCEL_INTENT: -1003,
};

// Custom Slot Type Constants (REMEMBER TO UPDATE WHEN SLOTS ARE UPDATED!)
const BASE_SPOKEN = [
    null,
    null,
    "binary",
    "ternary",
    "quarternary",
    "quinary",
    "senary",
    "septenary",
    "octal",
    "base 9",
    "decimal",
    "undecimal",
    "duodecimal",
    "tridecimal",
    "tetradecimal",
    "pentadecimal",
    "hexadecimal",
    "base 17",
    "base 18",
    "base 19",
    "vigesimal",
    "base 21",
    "base 22",
    "trivigesimal",
    "base 24",
    "base 25",
    "hexavigesimal",
    "heptavigesimal",
    "base 28",
    "base 29",
    "trigesimal",
    "base 31",
    "duotrigesimal",
    "tritrigesimal",
    "base 34",
    "base 35",
    "hexatrigesimal"
];

const BASE_NUM = [
    null,
    null,
    "base 2",
    "base 3",
    "base 4",
    "base 5",
    "base 6",
    "base 7",
    "base 8",
    "base 9",
    "base 10",
    "base 11",
    "base 12",
    "base 13",
    "base 14",
    "base 15",
    "base 16",
    "base 17",
    "base 18",
    "base 19",
    "base 20",
    "base 21",
    "base 22",
    "base 23",
    "base 24",
    "base 25",
    "base 26",
    "base 27",
    "base 28",
    "base 29",
    "base 30",
    "base 31",
    "base 32",
    "base 33",
    "base 34",
    "base 35",
    "base 36"
];

const BASE_ORDER = {
    PRE: [
    "original",
    "first",
    "1st",
    "input",
    "pre",
    "before",
    "former",
    "initial"
    ],
    POST: [
    "converted",
    "second",
    "2nd",
    "output",
    "post",
    "last",
    "after",
    "latter",
    "final"
    ]
};

// Custom "sorry" bank, for making apologies
const APOLOGY_CONSTANTS = {
    FORMER: [
        "Sorry. ",
        "My apologies. ",
        "I am sorry. ",
        "I'm sorry. ",
        "My bad. ",
        "Apologies. ",
        "Hmmm. "
    ],
    LATTER: [
        "I didn\'t get that. ",
        "I didn\'t quite get what you said. ",
        "I didn\'t get what you just said. ",
        "I didn\'t get what you said. ",
        "I did not get that. ",
        "I did not quite get what you said. ",
        "I did not get what you just said. ",
        "I did not get what you said. ",
        "I had some trouble understanding you. ",
        "I had trouble getting what you said. ",
        "I had trouble understanding you. ",
        "Didn\'t get that. ",
        "Didn\'t quite get that. ",
    ]
};

/*
    Generates a random Apology pairing using the bank above. 
    If latter is specified, will append Alexa's "deaf" responses.
*/
const generateApology = function(latter) {
    var apology = APOLOGY_CONSTANTS.FORMER[Math.floor(Math.random() * APOLOGY_CONSTANTS.FORMER.length)];
    if (latter) {
        return apology + APOLOGY_CONSTANTS.LATTER[Math.floor(Math.random() * APOLOGY_CONSTANTS.LATTER.length)];
    } else {
        return apology;
    }
};

//
//  Conversion function
//

/*
    Converts a number from one number system to another number system

    @param num      string  Number to convert. Must:
                                Not be a decimal (ERR: "INPUT_DECIMAL")
                                Be valid given preBase (ERR: "INPUT_INVALID")
                                Be positive, greater than 0 (ERR: "INPUT_NEGATIVE")
    @param preBase  int     Base of original number. Must be int within [2, 36] (ERR: "INPUT_BASE_NOT_SUPPORTED")
    @param postBase int     Base to convert to. Must be int within [2, 36] (ERR: "INPUT_BASE_NOT_SUPPORTED")

    @return postNum string  Converted number
*/
const convert = function(num, preBase, postBase) {
    var errorCode = 0;
    // preBase and postBase must be included in [2, 36]
    if ((preBase < 2 || preBase > 36) || (postBase < 2 || postBase > 36)) {
        errorCode += ERROR_CODE.INPUT_BASE_NOT_SUPPORTED;
    }

    // user input must not contain decimal point
    if (num.toString().includes('.')) {
        errorCode += ERROR_CODE.INPUT_DECIMAL;
    }

    // user input must be positive
    if (parseInt(num) == 0 || num.toString().includes('-')) {
        errorCode += ERROR_CODE.INPUT_NEGATIVE; 
    }

    // convert input into integer (base 10)
    const preNum = parseInt(num, preBase);

    // user input must be valid (e.g. decimal input with hex characters is not valid)
    if (isNaN(preNum)) {
        errorCode += ERROR_CODE.INPUT_INVALID;
    }

    // convert to desired base if input is valid. otherwise return total error code
    if (errorCode !== 0) {
        throw errorCode;
    }
    const postNum = (preNum).toString(postBase);
    return postNum;
};

/*
    Checks to see if there are any errors with the number input and/or the base provided

    @param  num         int     numerical input
    @param  base        int     base input, also a number
    @param  promptCode  int     code of the function that called this method

    @return num or base if it passes through without errors
    
    @throw error code pertaining to the error the method finds in either num or base
*/
const errorCheckerHelper = function(num, base, promptCode) {
    switch (promptCode) {
        // TODO: NEED TO REDO THIS CODE TO ALLOW FOR ALPHANUMERIC CHARACTERS. Numerical voice input must be stored as a string, not as a number
        case PROMPT_CODE.NUMBER_INPUT: {
            // user input must be a number
            if (isNaN(num)) {
                throw ERROR_CODE.INPUT_NEGATIVE;
            }
            // user input must not contain decimal point
            if (num.toString().includes('.')) {
                throw ERROR_CODE.INPUT_DECIMAL;
            }
            // user input must be positive
            if (parseInt(num) == 0 || num.toString().includes('-')) {
                throw ERROR_CODE.INPUT_NEGATIVE; 
            }
            return num;
        }
        case PROMPT_CODE.BASE_INPUT: {
            // base must be a number. also, preBase and postBase must be included in [2, 36].
            if (isNaN(base) || (base < 2 || base > 36)) {
                throw ERROR_STRINGS.INPUT_BASE_NOT_SUPPORTED;
            }
            return base;
        }

        case PROMPT_CODE.VALIDATE_INPUT: {
            var numString = num.toString();

            var invalid = true;
            switch (base) {
                case 2: {
                    invalid = /[^0-1]/.test(numString);
                    break;
                }
                case 3: {
                    invalid = /[^0-2]/.test(numString);
                    break;
                }
                case 4: {
                    invalid = /[^0-3]/.test(numString);
                    break;
                }
                case 5: {
                    invalid = /[^0-4]/.test(numString);
                    break;
                }
                case 6: {
                    invalid = /[^0-5]/.test(numString);
                    break;
                }
                case 7: {
                    invalid = /[^0-6]/.test(numString);
                    break;
                }
                case 8: {
                    invalid = /[^0-7]/.test(numString);
                    break;
                }
                case 9: {
                    invalid = /[^0-8]/.test(numString);
                    break;
                }
                case 10: {
                    invalid = /[^0-9]/.test(numString);
                    break;
                }
                case 11: {
                    invalid = /[^0-A]/i.test(numString);
                    break;
                }
                case 12: {
                    invalid = /[^0-B]/i.test(numString);
                    break;
                }
                case 13: {
                    invalid = /[^0-C]/i.test(numString);
                    break;
                }
                case 14: {
                    invalid = /[^0-D]/i.test(numString);
                    break;
                }
                case 15: {
                    invalid = /[^0-E]/i.test(numString);
                    break;
                }
                case 16: {
                    invalid = /[^0-F]/i.test(numString);
                    break;
                }
                case 17: {
                    invalid = /[^0-G]/i.test(numString);
                    break;
                }
                case 18: {
                    invalid = /[^0-H]/i.test(numString);
                    break;
                }
                case 19: {
                    invalid = /[^0-I]/i.test(numString);
                    break;
                }
                case 20: {
                    invalid = /[^0-J]/i.test(numString);
                    break;
                }
                case 21: {
                    invalid = /[^0-K]/i.test(numString);
                    break;
                }
                case 22: {
                    invalid = /[^0-L]/i.test(numString);
                    break;
                }
                case 23: {
                    invalid = /[^0-M]/i.test(numString);
                    break;
                }
                case 24: {
                    invalid = /[^0-N]/i.test(numString);
                    break;
                }
                case 25: {
                    invalid = /[^0-O]/i.test(numString);
                    break;
                }
                case 26: {
                    invalid = /[^0-P]/i.test(numString);
                    break;
                }
                case 27: {
                    invalid = /[^0-Q]/i.test(numString);
                    break;
                }
                case 28: {
                    invalid = /[^0-R]/i.test(numString);
                    break;
                }
                case 29: {
                    invalid = /[^0-S]/i.test(numString);
                    break;
                }
                case 30: {
                    invalid = /[^0-T]/i.test(numString);
                    break;
                }
                case 31: {
                    invalid = /[^0-U]/i.test(numString);
                    break;
                }
                case 32: {
                    invalid = /[^0-V]/i.test(numString);
                    break;
                }
                case 33: {
                    invalid = /[^0-W]/i.test(numString);
                    break;
                }
                case 34: {
                    invalid = /[^0-X]/i.test(numString);
                    break;
                }
                case 35: {
                    invalid = /[^0-Y]/i.test(numString);
                    break;
                }
                case 36: {
                    invalid = /[^0-Z]/i.test(numString);
                    break;
                }
            }
            if (invalid) {
                throw ERROR_STRINGS.INPUT_INVALID;
            }
        }
    }
};


//
// Storing bases and speech equivalents. Used arrays for quick conversion
//

/*
    Converts spoken base into an int for processing

    @param String   the base uttered by the user

    @return int     the integer representation of the base

    @throws         error if invalid base provided
*/
const convertBaseIntoInt = function(base) {
    var baseNum = BASE_NUM.indexOf(base.toLowerCase());
    var baseSpoken = BASE_SPOKEN.indexOf(base.toLowerCase());

    if (baseNum == -1 && baseSpoken == -1) {
        throw ERROR_STRINGS.INPUT_BASE_NOT_SUPPORTED;
    }

    return baseNum !== -1 ? baseNum : baseSpoken;
};


/*
    Gets the order of the base uttered by the user. Assumes input falls under BASE_ORDER Custom Slot Type

    @param String   the base order uttered by the user

    @return int     base code representing the order
*/
const processBaseOrderInput = function(baseOrder) {
    var preBaseOrder = BASE_ORDER.PRE.indexOf(baseOrder.toLowerCase());
    var postBaseOrder = BASE_ORDER.POST.indexOf(baseOrder.toLowerCase());

    if (preBaseOrder == -1 && postBaseOrder == -1) {
        throw ERROR_STRINGS.INPUT_INVALID_BASE_ORDER;
    }

    return preBaseOrder != -1 ? BASE_CODE.PRE : BASE_CODE.POST;
};


//
//  Voice strings (English only)
//
const staticVoicebackStrings = {
    // general interface
    PROMPT_WELCOME: 'Welcome to ' + SKILL_NAME  + '! ' +  
                    'Start by saying a number you want to convert. I will guide you with the rest. ' +
                    'If you need help at any moment, just say, help. ' +
                    'So, what number do you want to convert?',

    PROMPT_NUMBER:  'Please provide a number you want to convert. ' + 
                    'For example, you can say, five. ' +
                    'What number do you want me to convert?',
    
    REPROMPT_NUMBER:    generateApology(true) + 'Please say the number you want to convert. ' +
                        'It must be a positive whole number. It can be in any base from 2 to 36. ' +
                        'What\'s the number you want me to convert?',

    PROMPT_BASE:    'Please say a base. For example, you can say, base 2. You can even say, binary. ' + 
                    'Which base do you want to work with?',

    PROMPT_BASE_ORDER: 'Is the base you provided for the original number, or the converted number?',

    
    // help, cancel, stop
    HELP_MESSAGE:   'Start by saying a positive whole number you want to convert, and I will guide you with the rest. ' +
                    'For example, you can say, 50. ' + 
                    'You can also give me a complete request like, Convert 50 from decimal into binary, and I\'ll give you your answer right away. ' +
                    'I can work with any base between 2 and 36. ' + 
                    'But right now I can only accept starting numbers from bases 2 to 10. I can still convert into bases as large as 36 though. ' +
                    'If you want to start over, say cancel. ' +
                    'Say stop, if you had enough of me. ' +
                    'So what number do you want to convert?',
    CANCEL_MESSAGE: 'Let\'s start over from the beginning. What number do you want to convert?',
    STOP_MESSAGE: 'Thanks for using ' + SKILL_NAME + '! Good bye.'

};

// Dynamic voiceback strings

const generatePromptInputNumberVoicebackString = function(preBase, postBase) {
    if (!preBase && !postBase) {
        return 'What number do you want me to convert for you?';
    }
    if (preBase && postBase) {
        return 'Which number in the ' + BASE_SPOKEN[preBase] + ' system, do you want me to convert into the ' + BASE_SPOKEN[postBase] + ' system?';
    }
    if (preBase) {
        return 'Which number in the ' + BASE_SPOKEN[preBase] + ' system, do you want me to convert?';
    }
    if (postBase) {
        return 'Which number do you want me to convert into the ' + BASE_SPOKEN[postBase] + ' system?';
    }
}

const generateRepromptInputNumberVoicebackString = function(preBase, postBase) {
    return generateApology(true) + generatePromptInputNumberVoicebackString(preBase, postBase);
}

const generatePromptPreBaseVoicebackString = function(handler) {
    return 'In which base is the number ' + handler.attributes['inputNum'] + '. You can say something like, base 2, \
        or you can even say, binary.';
};

const generateRepromptPreBaseVoicebackString = function(handler) {
    return generateApology(true) + 'What base is the the number, ' + handler.attributes['inputNum'] + ', in?';
};

const generatePromptPostBaseVoicebackString = function(handler) {
    var inputNum = handler.attributes['inputNum'];
    var preBase = handler.attributes['preBase'];
    inputNum = spellOut(preBase, inputNum);
    return 'To which base do you want to convert the number, ' + BASE_SPOKEN[preBase] + ', ' + inputNum + '.';
};

const generateRepromptPostBaseVoicebackString = function(handler) {
    var inputNum = handler.attributes['inputNum'];
    var preBase = handler.attributes['preBase'];
    inputNum = spellOut(preBase, inputNum);
    return generateApology(true) + 'Please say the base you want to \
        convert ' + BASE_SPOKEN[preBase] + ', ' + inputNum + ' to.\
        You can say something like, base 2, or you can even say, binary. I can convert your number \
        to any base between 2 and 36.'
};

const generatePromptBaseInputVoicebackString = function(baseInput) {
    return 'Which number is ' + baseInput + " for? The original number, or the converted number?";
};

const generateRepromptBaseInputVoicebackString = function(baseInput) {
    return 'Is ' + baseInput + ' for the original number, or the converted number?';
};

const generateResultVoicebackString = function(handler) {
    var inputNum = handler.attributes['inputNum'];
    var outputNum = handler.attributes['outputNum'];
    var preBase = handler.attributes['preBase'];
    var postBase = handler.attributes['postBase'];

    var writtenResult = inputNum + ' (' + BASE_SPOKEN[preBase] + ') = ' + outputNum + ' (' + BASE_SPOKEN[postBase] + ')';

    inputNum = spellOut(preBase, inputNum);
    outputNum = spellOut(postBase, outputNum);

    return [BASE_SPOKEN[preBase] + ', ' + inputNum + ', in ' + BASE_SPOKEN[postBase] + ', is ' + outputNum, writtenResult];
};


/*
    For generating error prompts

    @param  What do you know

    @return A list in the form of (*currently not included):
        [0] Prompt message
        [1] Reprompt message (not for ":tell")
       *[2] Card title
       *[3] Card written message
       *[4] Card image url
*/
const generateErrorVoicebackString = function(num, baseInput, inputBaseOrder, err, handler, errorCode) {
    // Amend base into error prompt, if available
    var preBase = handler.attributes['preBase'];
    var postBase = handler.attributes['postBase'];

    var baseAmend = null;
    var baseAmend_baseInput = ' that you want converted';

    var baseString = '';

    if (!preBase && !postBase) {
        baseAmend = '?';
        baseAmend_baseInput = ' do you want to work with? Say, base, followed by the number.';
        baseString = '';
    } else if (preBase && postBase) {
        baseAmend = ' from the ' + BASE_SPOKEN[preBase] + ' system, to the ' + BASE_SPOKEN[postBase] + ' system?';
        baseAmend_baseInput += baseAmend;
    } else if (preBase) {
        baseAmend = ' from the ' + BASE_SPOKEN[preBase] + ' system?';
        baseString = 'post-';
        baseAmend_baseInput += baseAmend;
    } else if (postBase) {
        baseAmend = ' into the ' + BASE_SPOKEN[postBase] + ' system?'
        baseString = 'pre-'
        baseAmend_baseInput += baseAmend;
    }

    // Generate the error prompt based on errorCode provided
    switch (errorCode) {
        case ERROR_CODE.INPUT_BASE_NOT_SUPPORTED: {
            return [generateApology(false) + baseInput + ' is not a valid ' + baseString + 'base. What base between 2 and 36' + baseAmend_baseInput, 
                staticVoicebackStrings.PROMPT_BASE];
        }
        case ERROR_CODE.INPUT_DECIMAL: {
            return [generateApology(false) + num + ' is not a whole number. Convert Number can only convert whole numbers. What positive, whole number do you want converted' + baseAmend, 
                generateRepromptInputNumberVoicebackString(preBase, postBase)];
        }
        case ERROR_CODE.INPUT_NEGATIVE: {
            return [generateApology(false) + num + ' is not a positive number. I can only convert positive numbers. What number do you want me to convert for you' + baseAmend, 
                generateRepromptInputNumberVoicebackString(preBase, postBase)];
        }
        case ERROR_CODE.INPUT_INVALID: {
            return [generateApology(false) + num + ', is not a valid number in the ' + BASE_SPOKEN[baseInput] + ' system. Which number system is the number, ' + num + ' in, that you want converted' + baseAmend, 
                    generateRepromptInputNumberVoicebackString(preBase, postBase)];
        }
        case ERROR_CODE.INPUT_INVALID_BASE_ORDER: {
            return[generateApology(false) + inputBaseOrder + ' is not a valid base order response. Which number is the number, ' + BASE_SPOKEN[handler.attributes['tempBase']] + ' ' + [handler.attributes['inputNum']] + 
                    '? The original, or the converted number?', 
                    staticVoicebackStrings.PROMPT_BASE_ORDER];
        }
    }
};


//
//  Cards stuff
//

// Card titles
const CARD_TITLE = {
    WELCOME:    'Welcome',
    HELP:       'How to convert a number',
    ERROR:      'There was an error converting your number',
    PROGRESS:   'We almost have all your inputs. Here\'s what we have now...',
    RESULT:     'Your converted number'
};

const staticCardContentStrings = {
    HELP:   'Welcome! This simple skill helps you convert any number from one base numeral system to another.\n' +
            'Get started by saying things like:\n' +
            '\"Convert 10110 from Binary into Decimal.\"\n' +
            '\"Convert 50 from Base-10 into Base-16.\"\n' +
            '\"Convert 256 from the Decimal System into Binary.\"\n' +
            'Few things to note:\n' +
            '-I can only convert positive, whole numbers.\n' +
            '-I can convert numbers into any radix between 2 and 36, but I can only convert from any base between 2 and 10.\n' +
            '-When saying bases, you must say, \"Base \" followed by a number. Of course you can also say the full name of the system, e.g Hexadecimal, for Base-16.\n' +
            '-At any point, say \"Cancel\" to start over.\n' +
            '-Also, you can say \"Stop\" to close the skill.\n' +
            'Finally, whenever Alexa is talking, feel free to interrupt and provide your inputs! Note you can provide inputs one at a time and in any order you wish.'
};


//
//  SSML helper functions
//

/*
    Output the spelled-out number if not in decimal base. Otherwise, spit the original number back out.
*/
const spellOut = function(base, num) {
    var spelledOut = '';
    num = num.toString();
    if (base !== 10) {
        if (base < 10) {
            spelledOut = "<say-as interpret-as=\"digits\">";
        } else if (base > 10) {
            spelledOut = "<say-as interpret-as=\"characters\">";
        }
        for (var i = 0; i < num.length; i++) {
            spelledOut += "<break time=\"3ms\"/>" + num[i];
        }
        return spelledOut + "</say-as>";
    }
     else {
        return num;
    }
}


//
//  Other helper functions
//

/*
    Returns true if object is in array
*/
const isInArray = function(arr, obj) {
    return arr.indexOf(obj) > -1;
}

//
//  HANDLERS
//
//  There are 3 sections:
//      PART 1: Intent handlers, including built-in intents
//      PART 2: Prompt helpers (non-intent, history stored)
//      PART 3: Operational helpers (non-intent, function portability)
//
var handlers = {

    //
    //  PART 1: Intent handlers
    //

    // Called when user does not provide a specific request but invokes the skill invocation name. Basically it's "Alexa + skill invocation name."
    'LaunchRequest': function () {
        this.emit('StoreLastInputHelper', INPUT_CODE.LAUNCH);
        this.emit('WelcomeHelper');
    },

    // Called when user provides invalid request. TODO: FIX MESSAGE
    'Unhandled': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.UNHANDLED);
        const speechOutput = staticVoicebackStrings.HELP_MESSAGE;
        this.emit('StoreLastPromptHelper', PROMPT_CODE.UNHANDLED_EXCEPTION);
        this.emit(':ask', speechOutput, speechOutput);
    },

    // User provided number input only.
    'NumberInput': function() {
        // Use prompt history to check to see if user provided a base, or a number.
        this.emit('InitializePromptTracker');
        var lastPrompt = this.attributes['lastPrompt'];
        var basePrompts = [PROMPT_CODE.PROMPT_PREBASE_HELPER, 
                            PROMPT_CODE.PROMPT_POSTBASE_HELPER, 
                            PROMPT_CODE.ERROR_PROMPT_BASE_INPUT_HELPER,
                            // for invalid input (inputNum + preBase incompat), we prompt for a base.
                            PROMPT_CODE.ERROR_PROMPT_INVALID_INPUT]; 
        if (isInArray(basePrompts, lastPrompt[lastPrompt.length - 1])) {
            // user provided a base
            try {
                this.emit('BaseInput', this.event.request.intent.slots.inputNum.value);
                return;
            } catch (err) {
                return;
            }
        } else {
            // user provided a number, not a base
            this.emit('StoreLastInputHelper', INPUT_CODE.NUMBER);
            // Store input num as session attribute
            try {
                this.emit('StoreNumberInput', this.event.request.intent.slots.inputNum.value);
            } catch (err) {
                return;
            }
        }

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // User provided base input only (unspecified pre or post)
    'BaseInput': function(num) {
        this.emit('StoreLastInputHelper', INPUT_CODE.BASE);
        // if user provided just a number input that's a base
        var baseNum;
        var baseSpoken;
        if (num) {
            baseNum = num;
        } else {
            baseNum = this.event.request.intent.slots.baseNum.value;
            baseSpoken = this.event.request.intent.slots.BASE_SPOKEN.value;
        }

        // store input as unclassified base session attribute
        if (baseNum || baseSpoken) {
            try {
                this.emit('BaseHandler', baseNum, baseSpoken, BASE_CODE.TEMP);
            } catch (err) {
                return;
            }
            // assume base provided is the missing base, and link it. if both bases are missing, ask if it's pre or post base
            try {
                this.emit('LinkBaseHelper');
            } catch (err) {
                return;
            }
        }

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // User provided preBase only
    'PreBaseInput': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.PRE_BASE);
        if (this.event.request.intent.slots.preBase.value || this.event.request.intent.slots.PRE_BASE_SPOKEN.value) {
            try {
                this.emit('BaseHandler', this.event.request.intent.slots.preBase.value, this.event.request.intent.slots.PRE_BASE_SPOKEN.value, BASE_CODE.PRE);
            } catch (err) {
                return;
            }
        }

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');
    
    },

    // User provided postBase only
    'PostBaseInput': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.POST_BASE);
        if (this.event.request.intent.slots.postBase.value || this.event.request.intent.slots.POST_BASE_SPOKEN.value) {
            prePost = true;
            try {
                this.emit('BaseHandler', this.event.request.intent.slots.postBase.value, this.event.request.intent.slots.POST_BASE_SPOKEN.value, BASE_CODE.POST);
            } catch (err) {
                return;
            }
        }

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // User provides base order input only. Check to see what is missing and prompt accordingly
    'BaseOrderInput': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.BASE_ORDER);
        var inputBaseOrder = this.event.request.intent.slots.BASE_ORDER.value;

        // determine order using input
        var baseOrder;
        try {
            baseOrder = processBaseOrderInput(inputBaseOrder);
        } catch (err) {
            this.emit('ErrorPromptHelper', null, null, inputBaseOrder, err, handler, ERROR_CODE.INPUT_INVALID_BASE_ORDER, PROMPT_CODE.ERROR_PROMPT_BASE_ORDER_INPUT_HELPER);
            return;
        }

        // classify unclassified base accordingly
        if (baseOrder == BASE_CODE.PRE) {
            this.attributes['preBase'] = this.attributes['tempBase'];
        } else if (baseOrder == BASE_CODE.POST) {
            this.attributes['postBase'] = this.attributes['tempBase'];
        }

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // User provides number input and pre base only
    'NumPreBaseInput': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.NUM_PRE_BASE);
        // Store input num as session attribute
        try {
            this.emit('StoreNumberInput', this.event.request.intent.slots.inputNum.value);
        } catch (err) {
            return;
        }

        // Handle preBase
        try {
            this.emit('BaseHandler', this.event.request.intent.slots.preBase.value, this.event.request.intent.slots.PRE_BASE_SPOKEN.value, BASE_CODE.PRE);
        } catch (err) {
            return;
        }

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // User provides number input and post base only
    'NumPostBaseInput': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.NUM_POST_BASE);
        // Store input num as session attribute
        try {
            this.emit('StoreNumberInput', this.event.request.intent.slots.inputNum.value);
        } catch (err) {
            return;
        }

        // Handle postBase
        try {
            this.emit('BaseHandler', this.event.request.intent.slots.postBase.value, this.event.request.intent.slots.POST_BASE_SPOKEN.value, BASE_CODE.POST);
        } catch (err) {
            return;
        }

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // User provides both pre and post bases only
    'BothBaseInput': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.BOTH_BASE);

        // clear out existing bases
        this.attributes['preBase'] = null;
        this.attributes['postBase'] = null;

        // Handle preBase first
        try {
            this.emit('BaseHandler', this.event.request.intent.slots.preBase.value, this.event.request.intent.slots.PRE_BASE_SPOKEN.value, BASE_CODE.PRE);
        } catch (err) {
            return;
        }

        // Handle postBase next
        try {
            this.emit('BaseHandler', this.event.request.intent.slots.postBase.value, this.event.request.intent.slots.POST_BASE_SPOKEN.value, BASE_CODE.POST);
        } catch (err) {
            return;
        }

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');           

    },

    // User provides all inputs
    'CompleteInput': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.COMPLETE);
        // Store input num as session attribute
        try {
            this.emit('StoreNumberInput', this.event.request.intent.slots.inputNum.value);
        } catch (err) {
            return;
        }

        // Handle preBase
        try {
            this.emit('BaseHandler', this.event.request.intent.slots.preBase.value, this.event.request.intent.slots.PRE_BASE_SPOKEN.value, BASE_CODE.PRE);
        } catch (err) {
            return;
        }
        
        // Handle postBase
        try {
            this.emit('BaseHandler', this.event.request.intent.slots.postBase.value, this.event.request.intent.slots.POST_BASE_SPOKEN.value, BASE_CODE.POST);
        } catch (err) {
            return;
        }

        // Convert!
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // Built-in help intent for when user says "Help". Prompt via "Say, help, if you need help."
    'AMAZON.HelpIntent': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.AMAZON_HELP_INTENT);

        const speechOutput = staticVoicebackStrings.HELP_MESSAGE;
        this.emit('StoreLastPromptHelper', PROMPT_CODE.AMAZON_HELP_INTENT);
        this.emit(':askWithCard', speechOutput, speechOutput, CARD_TITLE.HELP, staticCardContentStrings.HELP, null);
    },

    // Built-in stop intent for when user says "Stop". Prompt via "you can also say, stop, if you're done." 
    // Needs to be offered so user know show to exit the skill if stuck.
    'AMAZON.StopIntent': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.AMAZON_STOP_INTENT);
        this.emit('StoreLastPromptHelper', PROMPT_CODE.AMAZON_STOP_INTENT);
        this.emit(':tell', staticVoicebackStrings.STOP_MESSAGE);
    },

    // Built-in stop intent for when the user says "Cancel"
    'AMAZON.CancelIntent': function() {
        this.emit('StoreLastInputHelper', INPUT_CODE.AMAZON_CANCEL_INTENT);
        this.emit('StoreLastPromptHelper', PROMPT_CODE.AMAZON_CANCEL_INTENT);
        this.emit('ResetSessionAttributes');
        this.emit(':ask', staticVoicebackStrings.CANCEL_MESSAGE, staticVoicebackStrings.REPROMPT_NUMBER);
    },

    // Built-in request for when user says "exit", no user response, or when error occurs
    'SessionEndedRequest': function() {
        this.emit(':tell', staticVoicebackStrings.STOP_MESSAGE);
    },


    //
    //  PART 2: Prompt helper functions (non-intent functions)
    //

    'WelcomeHelper': function() {
        const speechOutput = staticVoicebackStrings.PROMPT_WELCOME;
        const reprompt = staticVoicebackStrings.REPROMPT_NUMBER;
        this.emit('StoreLastPromptHelper', PROMPT_CODE.WELCOME);
        this.emit(':ask', speechOutput, reprompt);
    },

    'PromptNumberHelper': function(preBase, postBase) {
        const speechOutput = generatePromptInputNumberVoicebackString(preBase, postBase);
        const reprompt = generateRepromptInputNumberVoicebackString(preBase, postBase);
        this.emit('StoreLastPromptHelper', PROMPT_CODE.PROMPT_NUMBER_HELPER);
        this.emit(':ask', speechOutput, reprompt);
    },

    'PromptPreBaseHelper': function() {
        const speechOutput = generatePromptPreBaseVoicebackString(this);
        const reprompt = generateRepromptPreBaseVoicebackString(this);
        this.emit('StoreLastPromptHelper', PROMPT_CODE.PROMPT_PREBASE_HELPER);
        this.emit(':ask', speechOutput, reprompt);
    },

    'PromptPostBaseHelper': function() {
        const speechOutput = generatePromptPostBaseVoicebackString(this);
        const reprompt = generateRepromptPostBaseVoicebackString(this);
        this.emit('StoreLastPromptHelper', PROMPT_CODE.PROMPT_POSTBASE_HELPER);
        this.emit(':ask', speechOutput, reprompt);
    },

    'PromptBaseOrderHelper': function(baseInput) {
        const speechOutput = generatePromptBaseInputVoicebackString(baseInput);
        const reprompt = generateRepromptBaseInputVoicebackString(baseInput);
        this.emit('StoreLastPromptHelper', PROMPT_CODE.PROMPT_BASE_ORDER_HELPER);
        this.emit(':ask', speechOutput, reprompt);
    },

    // If user provided valid postBase and then messes up with preBase and inputNum combination, what to do with postBase?
    'ErrorPromptHelper': function(num, baseInput, baseOrderInput, err, handler, errorCode, promptCode) {
        switch (errorCode) {
            case ERROR_CODE.INPUT_BASE_NOT_SUPPORTED: {
                this.attributes['tempBase'] = null;
                break;
            }
            case ERROR_CODE.INPUT_INVALID: {
                // clear out the preBase because most likely the user messed up with the base instead of the number
                this.attributes['preBase'] = null;
                break;
            }
        }

        const prompts = generateErrorVoicebackString(num, baseInput, baseOrderInput, err, handler, errorCode);

        this.emit('StoreLastPromptHelper', promptCode);
        this.emit(':ask', prompts[0], prompts[1]);
    },


    //
    //  PART 3: Operational helpers
    //

    'StoreNumberInput': function(inputNum) {
        // verify number input
        try {
            errorCheckerHelper(inputNum, null, PROMPT_CODE.NUMBER_INPUT);
        } catch (err) {
            var errorString;
            switch (err) {
                case ERROR_CODE.INPUT_NEGATIVE: {
                    errorString = ERROR_STRINGS.INPUT_NEGATIVE;
                    break;
                }
                case ERROR_CODE.INPUT_DECIMAL: {
                    errorString = ERROR_STRINGS.INPUT_NEGATIVE;
                    break;
                }
                default: {
                    errorString = ERROR_STRINGS.UNHANDLED_EXCEPTION;
                }
            }
            this.emit('ErrorPromptHelper', inputNum, null, null, errorString, this, err, PROMPT_CODE.ERROR_PROMPT_NUMBER_INPUT_HELPER);
            throw ERROR_CODE.STOP;
        }

        // Store input num as session attribute
        this.attributes['inputNum'] = inputNum;
    },

    'BaseHandler': function(baseIntValue, baseSpokenValue, baseType) {
        var baseInt;
        var baseSpoken;
        if (baseIntValue) {
            // user already provided numerical base. verify base input is valid
            try {
                baseIntValue = parseInt(baseIntValue);
                baseInt = errorCheckerHelper(null, baseIntValue, PROMPT_CODE.BASE_INPUT);
            } catch (err) {
                this.emit('ErrorPromptHelper', null, baseIntValue, null, err, this, ERROR_CODE.INPUT_BASE_NOT_SUPPORTED, PROMPT_CODE.ERROR_PROMPT_BASE_INPUT_HELPER);
                throw ERROR_CODE.STOP;
            }
        } else if (baseSpokenValue) {
            // user provided spoken base. need to convert
            baseSpoken = baseSpokenValue;
            // store numerical representation of base
            try {
                baseInt = convertBaseIntoInt(baseSpoken);
            } catch (err) {
                this.emit('ErrorPromptHelper', null, baseSpoken, null, err, this, ERROR_CODE.INPUT_BASE_NOT_SUPPORTED, PROMPT_CODE.ERROR_PROMPT_BASE_INPUT_HELPER);
                throw ERROR_CODE.STOP;
            }
        }
        switch (baseType) {
            case BASE_CODE.PRE: {
                this.attributes['preBase'] = baseInt;
                break;
            }
            case BASE_CODE.POST: {
                this.attributes['postBase'] = baseInt;
                break;
            }
            case BASE_CODE.TEMP: {
                this.attributes['tempBase'] = baseInt;
                break;
            }
        }
    },

    'LinkBaseHelper': function() {
        var baseStatus = BASE_STATUS_CODE.ALL_BASES_PRESENT;
        if (!this.attributes['preBase']) {
            baseStatus += BASE_STATUS_CODE.NO_PREBASE;
        }
        if (!this.attributes['postBase']) {
            baseStatus += BASE_STATUS_CODE.NO_POSTBASE; 
        }
        if (baseStatus == BASE_STATUS_CODE.ALL_BASES_ABSENT) {
            // both bases are missing. Refer to prompt tracker which shows the last prompt the user was given, to use as context to assume which base [pre/post] the user provided
            this.emit('InitializePromptTracker');
            var lastPromptEntry = this.attributes['lastPrompt'][this.attributes['lastPrompt'].length - 1];
            if (lastPromptEntry == PROMPT_CODE.PROMPT_NUMBER_HELPER ||
                lastPromptEntry == PROMPT_CODE.PROMPT_PREBASE_HELPER || 
                PROMPT_CODE.ERROR_PROMPT_BASE_INPUT_HELPER) {
                // if last prompt was "PromptNumberHelper", OR "PromptPreBaseHelper" assume the base provided here is that of the first number
                this.attributes['preBase'] = this.attributes['tempBase'];
            } else if (lastPromptEntry == PROMPT_CODE.PROMPT_POSTBASE_HELPER) {
                // if last prompt was "PromptPostBaseHelper", then most likely the base provided is for the converted number
                this.attributes['postBase'] = this.attributes['tempBase'];
            } else {
                // but we can't always be sure, such as if the user started out by giving a base. ask the user what base it was for         
                this.emit('PromptBaseOrderHelper', BASE_SPOKEN[this.attributes['tempBase']]);
                throw ERROR_CODE.STOP;
            }

        } else if (baseStatus == BASE_STATUS_CODE.NO_POSTBASE) {
            // only the postBase is missing. assign baseInput to postBase
            this.attributes['postBase'] = this.attributes['tempBase'];
        } else if (baseStatus == BASE_STATUS_CODE.NO_PREBASE) {
            // only the preBase is missing. assign baseInput to preBase
            this.attributes['preBase'] = this.attributes['tempBase'];
        }
    },

    // last step of all intent handlers, so no need to throw errors
    'ValidateInputsAndCalculateResultHelper': function() {
        this.attributes['tempBase'] = null;

        var preBase = null;
        var postBase = null;

        var numStatus = true;
        // Check if number is present
        if (!this.attributes['inputNum']) {
            numStatus = false;
        }

        // Check if bases are present. Start assuming all bases present, then 'remove' base if necessary
        var baseStatus = BASE_STATUS_CODE.ALL_BASES_PRESENT;
        if (!(preBase = this.attributes['preBase'])) {
            // Check if preBase
            baseStatus += BASE_STATUS_CODE.NO_PREBASE;
        } else if (numStatus) {
            // if there is preBase and inputNum, check for radix compatibility        
            try {
                errorCheckerHelper(this.attributes['inputNum'], this.attributes['preBase'], PROMPT_CODE.VALIDATE_INPUT);
            } catch (err) {
                this.emit('ErrorPromptHelper', this.attributes['inputNum'], this.attributes['preBase'], null, err, this, ERROR_CODE.INPUT_INVALID, PROMPT_CODE.ERROR_PROMPT_INVALID_INPUT);
                return;
            }
        }
        if (!(postBase = this.attributes['postBase'])) {
            // Proceed with checking for postBase
            baseStatus += BASE_STATUS_CODE.NO_POSTBASE; 
        }

        // If no inputNum, then prompt for inputNum while mentioning bases already provided, if any
        if (!numStatus) {
            if (baseStatus == BASE_STATUS_CODE.ALL_BASES_PRESENT) {
                preBase = this.attributes['preBase'];
                postBase = this.attributes['postBase'];
            } else if (baseStatus == BASE_STATUS_CODE.NO_PREBASE) {
                postBase = this.attributes['postBase'];
            } else if (baseStatus == BASE_STATUS_CODE.NO_POSTBASE) {
                preBase = this.attributes['preBase'];
            }
            this.emit('PromptNumberHelper', preBase, postBase);
            return;
        }

        // If bases are missing, prompt for them
        if (baseStatus == BASE_STATUS_CODE.ALL_BASES_ABSENT || baseStatus == BASE_STATUS_CODE.NO_PREBASE) {
            // prompt preBase first if all bases absent or if it's the only base absent
            this.emit('PromptPreBaseHelper');
            return;
        } else if (baseStatus == BASE_STATUS_CODE.NO_POSTBASE) {
            // only the postBase is missing. prompt for postBase
            this.emit('PromptPostBaseHelper');
            return;
        }

        // If landed here, everything is present and ready to convert!
        var result;
        try {
            result = convert(this.attributes['inputNum'], this.attributes['preBase'], this.attributes['postBase']);
        } catch (err) {
            this.emit(':tell', SKILL_NAME + " had an error trying to process your request. Please try again.");
            return;
        }
        this.attributes['outputNum'] = result;
        this.emit('ProvideFinalResultHelper');
    },

    'ProvideFinalResultHelper': function() {
        this.emit('StoreLastPromptHelper', PROMPT_CODE.PROVIDE_FINAL_RESULT_HELPER);
        var result = generateResultVoicebackString(this);
        this.emit(':tellWithCard', result[0], CARD_TITLE.RESULT, result[1]);
    },

    'InitializePromptTracker': function() {
        // generate the session attribute if it is null
        if (!this.attributes['lastPrompt']) {
            this.attributes['lastPrompt'] = [];
        }
    },

    'InitializeInputTracker': function() {
        // generate the session attribute if it is null
        if (!this.attributes['lastInput']) {
            this.attributes['lastInput'] = [];
        }
    },

    'StoreLastPromptHelper': function(prompt) {
        this.emit('InitializePromptTracker');
        this.attributes['lastPrompt'].push(prompt);
    },

    'StoreLastInputHelper': function(input) {
        this.emit('InitializeInputTracker');
        this.attributes['lastInput'].push(input);
    },

    'ResetSessionAttributes': function() {
        this.attributes['lastInput'] = null;
        this.attributes['lastPrompt'] = null;
        this.attributes['inputNum'] = null;
        this.attributes['preBase'] = null;
        this.attributes['postBase'] = null;
        this.attributes['tempBase'] = null;
        this.attributes['outputNum'] = null;
    }
};