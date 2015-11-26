var util = require('util');
var EventEmitter = require('eventemitter3');

var QuizState = {
  IDLE: 0,
  QUESTION_PENDING: 1,
  QUESTION_ANSWERED: 2,
  PAUSED: 3
};

var QuizEvents = {
    QUESTION_PREP: 'questionPrep',
    QUESTION: 'question',
    CORRECT_ANSWER: 'correctAnswer',
    INCORRECT_ANSWER: 'incorrectAnswer',
    QUESTION_TIMEOUT: 'questionTimeout',
    OTHER_POSSIBLE_ANSWERS: 'otherPossibleAnswers',
    ANSWER_PROMPT_10_SECONDS_LEFT: 'answerPrompt10SecondsLeft',
    SHOW_SCORES: 'showScores',
    QUIZ_COMPLETE: 'quizComplete'
}


function Quiz() {
    this.settings = {
        startQuestionGap: 3,
        questionTime: 30,
        nextQuestionGap: 10,
        pointsPerQuestion: 1,
        showScoreInterval: 5,
        timeBetweenIncorrectResponses: 10
    };
    this.state = QuizState.IDLE;
    this.currentQuestionIndex = 0;
    this.questions = [];
    this.scores = [];
    this.lastIncorrectAnswerPing = 0;
    this.showScoreCount = 0;
};

util.inherits(Quiz, EventEmitter);

Quiz.prototype.init = function(data, slackChannel) {
    this.questions = data.questions;
    for(var setting in data.settings) {
        this.settings[setting] = data.settings[setting];
    }
    if(this.settings.randomise) {
        this.questions = Quiz.prototype.shuffle(this.questions);
    }
    if(this.settings.hasOwnProperty("totalQuestions")) {
        this.questions.splice(0, this.questions.length - this.settings.totalQuestions);
    }
    this.locale = data.locale;
    this.slackChannel = slackChannel;
};
Quiz.prototype.start = function() {
    if(this.state == QuizState.IDLE) {
        this.currentQuestionIndex = 0;
        this.startQuestion();
    }
};
Quiz.prototype.pause = function() {
    if(this.state != QuizState.PAUSED) {
        this.prePausedState = this.state;
        this.state = QuizState.PAUSED;
    }
};
Quiz.prototype.resume = function() {
    if(this.state == QuizState.PAUSED) {
        this.state = this.prePausedState;
    }
};
Quiz.prototype.stop = function() {
    clearInterval(this.interval);
    this.state = QuizState.IDLE;
};

Quiz.prototype.shuffle = function(o) {
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

Quiz.prototype.getCustomLocale = function(id) {
    if(this.locale != null && this.locale[id] && this.locale[id].length > 0) {
		var rnd = Math.floor(Math.random() * this.locale[id].length);
		return this.locale[id][rnd];
	}else{
		return false;
	}
};

Quiz.prototype.startQuestion = function() {
    if(this.state != QuizState.QUESTION_PENDING) {
        this.state = QuizState.QUESTION_PENDING;
        this.prepQuestion();    
    }
};
Quiz.prototype.prepQuestion = function() {
    this.emit(QuizEvents.QUESTION_PREP, this, this.currentQuestionIndex);
    setTimeout(this.outputQuestion.bind(this), this.settings.startQuestionGap * 1000);
}
Quiz.prototype.outputQuestion = function() {
    this.interval = setInterval(this.update.bind(this), 1000);
    this.currentQuestion = this.questions[this.currentQuestionIndex]; 
    this.currentQuestion.timeLeft = this.currentQuestion.time || this.settings.questionTime;
    this.currentQuestion.points = this.currentQuestion.points || this.settings.pointsPerQuestion;
    this.currentQuestion.answerCount = this.currentQuestion.answersNeeded || this.currentQuestion.answers.length;
    this.currentQuestion.pendingAnswers = this.currentQuestion.answers; 
    this.emit(QuizEvents.QUESTION, this, this.currentQuestion);
}
Quiz.prototype.timeoutQuestion = function() {
    this.emit(QuizEvents.QUESTION_TIMEOUT, this, this.currentQuestion);
    this.endQuestion();
}
Quiz.prototype.endQuestion = function() {
    this.state = QuizState.QUESTION_ANSWERED;
    clearInterval(this.interval);
    this.showScoreCount++;
    if(this.showScoreCount >= this.settings.showScoreInterval && this.scores.length > 0 && this.currentQuestionIndex < this.questions.length-1) {
        setTimeout((function() {this.emit(QuizEvents.SHOW_SCORES, this);}.bind(this)), 3000);
        this.showScoreCount = 0;
        setTimeout(this.nextQuestion.bind(this), 3000 + this.settings.nextQuestionGap * 1000);
    }else{
        setTimeout(this.nextQuestion.bind(this), this.settings.nextQuestionGap * 1000);
    }
};
Quiz.prototype.nextQuestion = function() {
    if(this.state == QuizState.QUESTION_ANSWERED) {
        if(this.currentQuestionIndex < this.questions.length-1) {
            this.currentQuestionIndex++;
            this.startQuestion();
        }else{
            this.complete();
        }
    }
};
Quiz.prototype.complete = function() {
    this.state = QuizState.IDLE;
    this.emit(QuizEvents.QUIZ_COMPLETE, this);
};
Quiz.prototype.isQuestionActive = function() {
    return this.state == QuizState.QUESTION_PENDING;
};
Quiz.prototype.checkAnswer = function(text, user) {
    if(user == null) return;
    var userText = text.toLowerCase();
    var i = this.currentQuestion.pendingAnswers.length-1;
    var correctAnswers = [];
    while(i >= 0 && this.currentQuestion.answerCount > 0) {
        for(var j=0; j<this.currentQuestion.pendingAnswers[i].text.length; j++) {
            if(userText.indexOf(this.currentQuestion.pendingAnswers[i].text[j].toLowerCase()) > -1) {
                correctAnswers.push(this.currentQuestion.pendingAnswers[i].text[0]);
                this.currentQuestion.answerCount--;
                this.currentQuestion.pendingAnswers.splice(i, 1);
                break;
            }
        }
        i--;
    }
    if(correctAnswers.length > 0) {
        var points = this.currentQuestion.points * correctAnswers.length;
        this.addScore(user.name, points);
        this.emit(QuizEvents.CORRECT_ANSWER, this, user, correctAnswers, points, this.currentQuestion.answerCount);
        if(this.currentQuestion.answerCount == 0) {
            if(this.currentQuestion.pendingAnswers.length > 0) {
                this.emit(QuizEvents.OTHER_POSSIBLE_ANSWERS, this, this.currentQuestion.pendingAnswers);
            }
            this.endQuestion();
        }
    }else{
        var now = new Date().getTime();
        if(now - this.lastIncorrectAnswerPing > this.settings.timeBetweenIncorrectResponses * 1000) {
            this.emit(QuizEvents.INCORRECT_ANSWER, this, user);
            this.lastIncorrectAnswerPing = now;
        }
    }
};
Quiz.prototype.getCorrectAnswers = function() {
    var text = "";
    var len = this.currentQuestion.answers.length;
    for(var i=0; i<len; i++) {
        if(i > 0 && i < len-1) text += ", ";
        if(i > 0 && i == len-1) text += " and ";
        text += "*" + this.currentQuestion.answers[i].text[0] + "*";
        
    }
    return text;
};

Quiz.prototype.addScore = function(user, points) {
    var isFound = false;
    for(var i=0; i<this.scores.length; i++) {
        if(this.scores[i].user == user) {
            this.scores[i].points += points;
            isFound = true;
            break;
        } 
    }
    if(!isFound) {
        this.scores.push({"user":user, "points":points});
    }
}

function sortScores(a, b){
	if(a.points == b.points ){
		return 0;
	}
	else{
		return (a.points < b.points) ? 1 : -1;
	}
}

Quiz.prototype.getScores = function(verb) {
    var text = "";
    var len = this.scores.length;
    this.scores.sort(sortScores);
    for(var i=0; i<len; i++) {
        var username = "<@" + this.scores[i].user + ">";
        if(i > 1 && i < len-1) text += ", ";
        if(i > 0 && i == len-1) text += " and ";
        if(i == 0) {
            text += "*" + username + "* " + verb + " with " + this.scores[i].points + " points! ";
        }else if(i == 1) {
            text += username + " has " + this.scores[i].points;
        }else{
            text += username + " " + this.scores[i].points;
        }
    }
    return text;
};

Quiz.prototype.update = function() {
    if(this.state == QuizState.PAUSED) return;
    this.currentQuestion.timeLeft--;
        if(this.currentQuestion.timeLeft <= 0) {
            this.timeoutQuestion();
        }else{
            if(this.currentQuestion.timeLeft == 10) {
                this.emit(QuizEvents.ANSWER_PROMPT_10_SECONDS_LEFT, this, this.currentQuestion.timeLeft);
            }
       }
};

module.exports = Quiz;
