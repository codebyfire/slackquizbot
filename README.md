# Slack Quizbot

A NodeJS module using Slack's RTM to allow a slack Bot to run user-generated quizzes in your Slack channels.

## Requirements
* Slack Bot - info on how to create one at https://api.slack.com/bot-users
* NodeJS

## Installation

```nodejs
npm install slackquizbot
```

## Usage

```js
var QuizBot = require('slackbotquiz');
var myQuizBot = new QuizBot("_YOUR_SLACK_BOT_TOKEN_");
```

## Bot Commands

Make sure your bot is present in the channel you want to run the quiz in. All commands will also work in DMs with your bot so you can test the quizzes privately. These examples assume your bot's username is quizbot, replace for your own

#### List quizzes
Ask Quizbot to tell you all the available quizzes
> @quizbot list quizzes

#### Start quiz <quiz_id>
Start the general_knowledge quiz
> @quizbot start quiz general_knowledge

#### Answering questions
Whenever a question is active Quizbot will search for any matching answers automatically

#### Pause quiz
If you want to pause the quiz for any reason
> @quizbot pause quiz

## Custom Quizzes
You can create your own quizzes using the[ Slack Quizbot Quiz Generator](codebyfire.github.io/slackquizbotbuilder). Once you've downloaded your JSON file, you can add it by either directly placing the file in the data folder or in Slack you can upload the file in a DM to @quizbot.
