// TODO: Implement UK and DE languages: invocation name, translations
// TODO: Note that only whole numbers can be converted. No decimals.

const Alexa = require('alexa-sdk');

const APP_ID = undefined; // TODO replacewith your app ID (OPTIONAL)

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context);

    // alexa.dynamoDBTableName = 'YourTableName'; // creates new table for userid:session.attributes

    alexa.registerHandlers(handlers);
    alexa.execute();
};

//
//  ERROR, STATUS, and CUSTOM SLOT TYPE constants
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
    INPUT_INVALID_BASE_ORDER: -16   // base order is not in custom slot type list
};

// Error string output for user
const ERROR_STRINGS = {
    INPUT_BASE_NOT_SUPPORTED: 'Please provide a base betweeen 2 and 36.',
    INPUT_DECIMAL: 'Please provide a number without a point value.',
    INPUT_NEGATIVE: 'Please provide a positive number.',
    INPUT_INVALID: 'Please provide a valid number and base pairing.',
    INPUT_INVALID_BASE_ORDER: 'Please say if the base you provided is for the original number, or the converted number.'
};

// Prompt codes to store history
const PROMPT_CODE = {
    WELCOME: 0,
    PROMPT_NUMBER: -1,
    NUMBER_INPUT: -2,
    BASE_INPUT: -3,
    BASE_ORDER_INPUT: -4,
    COMPLETE_INPUT: -5,

    PROMPT_NUMBER_HELPER: -11,
    PROMPT_PREBASE_HELPER: -12,
    PROMPT_POSTBASE_HELPER: -13,
    PROMPT_BASE_ORDER_HELPER: -14,
    
    PROVIDE_FINAL_RESULT_HELPER: -100, 

    ERROR_PROMPT_BASE_INPUT_HELPER: -101,

    AMAZON_HELP_INTENT: -1001,
    AMAZON_STOP_INTENT: -1002,
    AMAZON_CANCEL_INTENT: -1003,
};

// Custom Slot Type Constants
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
    "input",
    "pre",
    "before",
    "former",
    "initial"
    ],
    POST: [
    "converted",
    "second",
    "output",
    "post",
    "last",
    "after",
    "latter",
    "final"
    ]
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
    @param preBase  int     Base of original number. Must be int within [2, 36] (ERR: "INPUT_BASE_NOT-SUPPORTED")
    @param postBase int     Base to convert to. Must be int within [2, 36] (ERR: "INPUT_BASE_NOT-SUPPORTED")

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
    if (num.toString().includes('-')) {
        errorCode += ERROR_CODE.INPUT_NEGATIVE; 
    }

    // convert input into integer (base 10)
    const preNum = Number.parseInt(num, preBase);

    // user input must be valid (e.g. decimal input with hex characters is not valid)
    if (Number.isNaN(preNum)) {
        errorCode += ERROR_CODE.INPUT_INVALID;
    }

    // convert to desired base if input is valid. otherwise return total error code
    if (errorCode !== 0) {
        throw errorCode;
    }
    const postNum = (preNum).toString(postBase);
    return postNum;
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
    SKILL_NAME: 'American Convert Number',

    PROMPT_WELCOME: 'This is Convert Number. You can start by telling me any positive whole number you want to convert, and I will guide you with the rest. \
                    For example, you can say, 50. Or instead, you can give me a complete request, like, \
                    Convert 50 from decimal into binary. I can convert any whole numbers to and from any base between 2 and 36. \
                    If you need more help, just say, help.\
                    So, what number do you want to convert?',
    REPROMPT_WELCOME: 'Sorry, I didn\'t get that. Please say the number you want to convert.\
                            Your number can be a positive, whole number from any numerical system such as binary, decimal, or hexadecimal.\
                            I can convert any positive, whole numbers to and from any base between 2 and 36.\
                            What\'s the number you want me to convert?',
    
    PROMPT_NUMBER: 'Please provide a number you want to convert. I can convert any whole numbers to and from any base between 2 and 36. \
                    For example, you can say, five. What number do you want me to convert for you?',
    
    REPROMPT_NUMBER: 'Sorry, I didn\'t get that. Please say the number you want to convert.\
                            Your number can be a positive, whole number from any numerical system such as binary, decimal, or hexadecimal.\
                            I can convert any positive, whole numbers to and from any base between 2 and 36.\
                            What\'s the number you want me to convert?',

    PROMPT_BASE: 'Please provide a base. You can say something like, base 2, or you can even say, binary. You can say any base \
                    between 2 and 36.',

    PROMPT_BASE_ORDER: 'test base order prompt',

    
    // help, stop
    HELP_MESSAGE: 'you said help haha',
    HELP_REPROMPT: 'you said help haha',
    STOP_MESSAGE: 'Goodbye!',

};

const generatePromptPreBaseVoicebackString = function(handler) {
    return 'In which number system is the number' + handler.attributes['inputNum'] + '. You can say something like, base 2, \
        or you can even say, binary.';
};

const generateRepromptPreBaseVoicebackString = function(handler) {
    return 'Apologies, I didn\'t get that. Please say the numerical system ' + handler.attributes['inputNum'] + ' is in.\
        You can say something like, base 2, or you can even say, binary. I can convert any whole numbers to and \
        from any base between 2 and 36.';
};

const generatePromptPostBaseVoicebackString = function(handler) {
    var inputNum = handler.attributes['inputNum'];
    var preBase = handler.attributes['preBase'];
    inputNum = sayAsBinary(preBase, inputNum);
    return 'To which number system do you want to convert the number, ' + BASE_SPOKEN[preBase] + ' ' + inputNum + '.';
};

const generateRepromptPostBaseVoicebackString = function(handler) {
    var inputNum = handler.attributes['inputNum'];
    var preBase = handler.attributes['preBase'];
    inputNum = sayAsBinary(preBase, inputNum);
    return 'Sorry, I didn\'t get that. Please say the numerical system you want to \
        convert ' + BASE_SPOKEN[preBase] + ' ' + inputNum + ' to.\
        You can say something like, base 2, or you can even say, binary. I can convert your number \
        to any base between 2 and 36.'
};

const generateErrorPromptBaseInputVoicebackString = function(baseInput, err) {
    return 'Sorry. ' + baseInput + ' is not a valid base. ' + err;
};

const generateErrorRepromptBaseInputVoicebackString = function() {
    return staticVoicebackStrings.PROMPT_BASE;
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
    inputNum = sayAsBinary(preBase, inputNum);
    outputNum = sayAsBinary(postBase, outputNum);
    return BASE_SPOKEN[preBase] + ' ' + inputNum + ', in ' + BASE_SPOKEN[postBase] + ', is ' + outputNum;
};



//
//  SSML helper functions
//

/*
    Output the spelled out number if base is binary. Otherwise, spit the original number back out.
*/
const sayAsBinary = function(base, num) {
    if (base == 2) {
        return spellOutNumber(num);
    } else {
        return num;
    }
}

const spellOutNumber = function(num) {
    return "<say-as interpret-as=\"digits\">" + num + "</say-as>";
};


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

    // Called when user does not provide a specific request. Basically it's "Alexa + skill invocation name."
    'LaunchRequest': function () {
        this.emit('WelcomeHelper');
    },

    // Welcome! Provde a number to convert
    'PromptNumber': function () {
        this.emit('PromptNumberHelper');
    },

    // User provided number input only
    'NumberInput': function() {
        // Store input num as session attribute
        this.emit('StoreNumberInput', this.event.request.intent.slots.inputNum.value);

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // User provided base input only
    'BaseInput': function() {
        // store input as unclassified base session attribute
        this.emit('BaseHandler', this.event.request.intent.slots.baseNum.value, this.event.request.intent.slots.BASE_SPOKEN.value, BASE_CODE.TEMP);

        // assume base provided is the missing base, and link it. if both bases are missing, ask if it's pre or post base
        this.emit('LinkBaseHelper');

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');

    },

    // User provides base order input only. Check to see what is missing and prompt accordingly
    'BaseOrderInput': function() {
        var inputBaseOrder = this.event.request.intent.slots.BASE_ORDER.value;

        // determine order using input
        var baseOrder;
        try {
            baseOrder = processBaseOrderInput(inputBaseOrder);
        } catch (err) {
            this.emit(':ask', inputBaseOrder + " is not a valid response. " + err, staticVoicebackStrings.PROMPT_BASE_ORDER);
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

    // TODO: User provides number input and pre base only
    'NumPreBaseInput': function() {
        // Store input num as session attribute
        this.emit('StoreNumberInput', this.event.request.intent.slots.inputNum.value);

        // Handle preBase
        this.emit('BaseHandler', this.event.request.intent.slots.preBase.value, this.event.request.intent.slots.PRE_BASE_SPOKEN.value, BASE_CODE.PRE);

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // TODO: User provides number input and post base only
    'NumPostBaseInput': function() {
        // Store input num as session attribute
        this.emit('StoreNumberInput', this.event.request.intent.slots.inputNum.value);

        // Handle postBase
        this.emit('BaseHandler', this.event.request.intent.slots.postBase.value, this.event.request.intent.slots.POST_BASE_SPOKEN.value, BASE_CODE.POST);

        // validate inputs to see if anything's missing. calculate result if everything's there
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // User provides all inputs
    'CompleteInput': function() {
        // Store input num as session attribute
        this.emit('StoreNumberInput', this.event.request.intent.slots.inputNum.value);

        // Handle preBase
        this.emit('BaseHandler', this.event.request.intent.slots.preBase.value, this.event.request.intent.slots.PRE_BASE_SPOKEN.value, BASE_CODE.PRE);
        
        // Handle postBase
        this.emit('BaseHandler', this.event.request.intent.slots.postBase.value, this.event.request.intent.slots.POST_BASE_SPOKEN.value, BASE_CODE.POST);

        // Convert!
        this.emit('ValidateInputsAndCalculateResultHelper');
    },

    // Built-in help intent for when user says "Help". Prompt via "Say, help, if you need help."
    'AMAZON.HelpIntent': function() {
        const speechOutput = staticVoicebackStrings.HELP_MESSAGE;
        const reprompt = staticVoicebackStrings.HELP_REPROMPT;
        this.emit('StoreLastPromptHelper', PROMPT_CODE.AMAZON_HELP_INTENT);
        this.emit(':ask', speechOutput, reprompt);
    },

    // Built-in stop intent for when user says "Stop". Prompt via "you can also say, stop, if you're done." 
    // Needs to be offered so user know show to exit the skill if stuck.
    'AMAZON.StopIntent': function() {
        this.emit('StoreLastPromptHelper', PROMPT_CODE.AMAZON_STOP_INTENT);
        this.emit(':tell', staticVoicebackStrings.STOP_MESSAGE);
    },

    // Built-in stop intent for when the user says "Cancel"
    'AMAZON.CancelIntent': function() {
        this.emit('StoreLastPromptHelper', PROMPT_CODE.AMAZON_CANCEL_INTENT);
        this.emit(':tell', staticVoicebackStrings.STOP_MESSAGE);
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
        const reprompt = staticVoicebackStrings.REPROMPT_WELCOME;
        this.emit('StoreLastPromptHelper', PROMPT_CODE.WELCOME);
        this.emit(':ask', speechOutput, reprompt);
    },

    'PromptNumberHelper': function() {
        const speechOutput = staticVoicebackStrings.PROMPT_NUMBER;
        const reprompt = staticVoicebackStrings.REPROMPT_NUMBER;
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

    'ErrorPromptBaseInputHelper': function(baseInput, err) {
        const speechOutput = generateErrorPromptBaseInputVoicebackString(baseInput, err);
        const reprompt = generateErrorRepromptBaseInputVoicebackString();
        this.emit('StoreLastPromptHelper', PROMPT_CODE.ERROR_PROMPT_BASE_INPUT_HELPER);
        this.emit(':ask', speechOutput, reprompt);
    },

    'PromptBaseOrderHelper': function(baseInput) {
        const speechOutput = generatePromptBaseInputVoicebackString(baseInput);
        const reprompt = generateRepromptBaseInputVoicebackString(baseInput);
        this.emit('StoreLastPromptHelper', PROMPT_CODE.PROMPT_BASE_ORDER_HELPER);
        this.emit(':ask', speechOutput, reprompt);
    },

    //
    //  PART 3: Operational helpers
    //

    'StoreNumberInput': function(inputNum) {
        // Store input num as session attribute
        this.attributes['inputNum'] = inputNum;
    },

    'BaseHandler': function(baseIntValue, baseSpokenValue, baseType) {
        var baseInt;
        var baseSpoken;
        if (baseIntValue) {
            // user already provided numerical base
            baseInt = baseIntValue;
        } else if (baseSpokenValue) {
            // user provided spoken base. need to convert
            baseSpoken = baseSpokenValue;
            // store numerical representation of base
            try {
                baseInt = convertBaseIntoInt(baseSpoken);
            } catch (err) {
                this.emit(':ask', baseInput + " is not a valid base. " + err, staticVoicebackStrings.PROMPT_BASE);
                return;
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
                lastPromptEntry == PROMPT_CODE.PROMPT_PREBASE_HELPER) {
                // if last prompt was "PromptNumberHelper", OR "PromptPreBaseHelper" assume the base provided here is that of the first number
                this.attributes['preBase'] = this.attributes['tempBase'];
            } else if (lastPromptEntry == PROMPT_CODE.PROMPT_POSTBASE_HELPER) {
                // if last prompt was "PromptPostBaseHelper", then most likely the base provided is for the converted number
                this.attributes['postBase'] = this.attributes['tempBase'];
            } else {
                // but we can't always be sure. ask the user what base it was for         
                this.emit('PromptBaseOrderHelper', BASE_SPOKEN[this.attributes['tempBase']]);
                return;
            }

        } else if (baseStatus == BASE_STATUS_CODE.NO_POSTBASE) {
            // only the postBase is missing. assign baseInput to postBase
            this.attributes['postBase'] = this.attributes['tempBase'];
        } else if (baseStatus == BASE_STATUS_CODE.NO_PREBASE) {
            // only the preBase is missing. assign baseInput to preBase
            this.attributes['preBase'] = this.attributes['tempBase'];
        }
    },

    'ValidateInputsAndCalculateResultHelper': function() {
        // Check if number is present
        if (!this.attributes['inputNum']) {
            this.emit('PromptNumberHelper');
            return;
        }

        // Check if bases are present
        var baseStatus = BASE_STATUS_CODE.ALL_BASES_PRESENT;
        if (!this.attributes['preBase']) {
            baseStatus += BASE_STATUS_CODE.NO_PREBASE;
        }
        if (!this.attributes['postBase']) {
            baseStatus += BASE_STATUS_CODE.NO_POSTBASE; 
        }

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
            this.emit(':tell', "you messed up. try again.");
            return;
        }
        this.attributes['outputNum'] = result;
        this.emit('ProvideFinalResultHelper');
    },

    'ProvideFinalResultHelper': function() {
        this.emit('StoreLastPromptHelper', PROMPT_CODE.PROVIDE_FINAL_RESULT_HELPER);
        this.emit(':tell', generateResultVoicebackString(this));
    },

    'InitializePromptTracker': function() {
        // generate the session attribute if it is null
        if (!this.attributes['lastPrompt']) {
            this.attributes['lastPrompt'] = [];
        }
    },

    'StoreLastPromptHelper': function(prompt) {
        this.emit('InitializePromptTracker');
        this.attributes['lastPrompt'].push(prompt);
    }
};



/*
    Conversion function test suite
*/
const testConvert = function() {
    // dec vs. hex
    const numA1 = 54; // dec
    const numA2 = 36; // hex
    const numB1 = "AF123C"; // hex
    const numB2 = 11473468; // dec

    // dec vs. bin
    const numC1 = "101010";
    const numC2 = 42;

    // bin vs. hex
    const numD1 = "110110" // bin
    const numD2 = 36; // hex

    // illegal inputs
    const num_negative = -1;
    const base_unsupportedA = -1;
    const base_unsupportedB = 0;
    const base_unsupportedC = 1;
    const base_unsupportedD = 37;
    const num_decimal = 155.534;

    // legal inputs
    const base_supportedA = 2;
    const base_supportedB = 26;
    const base_supportedC = 36;


    // basic inputs: ERROR_CODE -1 (INPUT_BASE_NOT_SUPPORTED)
    console.log("Test unsupported base: " + base_unsupportedA + ". Expected output: -1.");
    console.log("Output: " + convert(numA1, base_unsupportedA, base_unsupportedA));

};