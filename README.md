# Slack Quizbot

A NodeJS module using Slack's RTM to allow a Slack bot to host user-generated quizzes in your Slack channels. A few quizzes come included but you can create your own quizzes at [Slack Quizbot Quiz Generator](codebyfire.github.io/slackquizbotbuilder)

## Requirements
* Slack bot - instructions on how to create a bot for your team at https://api.slack.com/bot-users
* NodeJS - Download NodeJS from https://nodejs.org/download/

## Installation

Create a folder and install slackquizbot at that location: 

```nodejs
npm install slackquizbot
```

Create an myquizbot.js file containing the following, adding in your unique bot token:

```js
var QuizBot = require('slackbotquiz');
var myQuizBot = new QuizBot("_YOUR_SLACK_BOT_TOKEN_");
```

Activate your Quizbot:

```nodejs
node myquizbot.js
```

## Bot Commands

Make sure your bot is present in the channel you want to run the quiz in. All commands will also work in DMs with your bot so you can test these commands privately.

#### List quizzes
Ask Quizbot to tell you all the available quizzes
> @quizbot list quizzes

#### Start quiz <quiz_id>
Start the general_knowledge quiz
> @quizbot start quiz general_knowledge

#### Answering questions
Whenever a question is active Quizbot will search for any matching answers automatically

#### Pause quiz
If you want to pause a quiz for any reason
> @quizbot pause quiz

#### Stop quiz
If you want to prematurely stop a quiz
> @quizbot stop quiz

## Create your own quizzes
You can create your own quizzes using the [Slack Quizbot Quiz Builder](codebyfire.github.io/slackquizbotbuilder). Once you've downloaded your JSON file, you can use it by either directly placing the file in a local folder called 'ata' or in Slack you can upload the file in a DM to your bot.
