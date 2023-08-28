from flask import Flask, render_template, request, jsonify
from flask_limiter import Limiter, util
import openai
import os
import json

app = Flask(__name__)

# Limiter 객체 한 번만 생성
limiter = Limiter(key_func=util.get_remote_address, app=app)


API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = API_KEY

@app.route('/')
def index():
    return render_template('index.html')

@limiter.limit("1 per minute")  # 분당 1회 요청으로 제한
@app.route('/generate_questions', methods=['POST'])
def generate_questions():
    type_selected = request.form.get('type')
    job_position = request.form.get('job_position')

    if type_selected == "personal_statement_form":
        introduction_article = request.form.get('introduction_article')
        personal_statement = request.form.get('personal_statement')

        prompt_content = f"""
        You're a hiring manager looking for a new {job_position} to join your team. Based on the following information, generate 7 interview questions and tips for each question. Please provide your response in JSON format with the following schema:
        {{
            "questions": [
                {{"question": "...", "tip": "..."}},
                {{"question": "...", "tip": "..."}},
                ...
            ]
        }}

        Instructions:
        - Format: Json
        - Level of Difficulty: Advanced
        - Number of Questions: 7
        - Target Audience: Applicant
        - Objective of Questions: To assess the applicant's qualifications and suitability for the role
        - Note: The 'tip' should guide the applicant on how best to answer the question.
        - Language Used: Korean

        Resume Information:
        - cover letter category: {introduction_article}
        - cover letter: {personal_statement}

        Please respond in Korean.
        """

        messages = [
            {"role": "system", "content": "You are a helpful interview question generator."},
            {"role": "user", "content": prompt_content}
        ]

    elif type_selected == "project":
        project_title = request.form.get('project_title')
        project_description = request.form.get('project_description')

        prompt_content = f"""
        You're a hiring manager looking for a new {job_position} to join your team. Based on the information about this project, generate 7 interview questions and tips for each question. Please provide your response in JSON format with the following schema:
        {{
            "questions": [
                {{"question": "...", "tip": "..."}},
                {{"question": "...", "tip": "..."}},
                ...
            ]
        }}

        Instructions:
        - Format: Json
        - Level of Difficulty: Advanced
        - Number of Questions: 7
        - Target Audience: Applicant
        - Objective of Questions: To assess the applicant's qualifications and suitability for the role
        - Note: The 'tip' should guide the applicant on how best to answer the question.
        - Language Used: Korean

        Project Information:
        - Project Title: {project_title}
        - Project Description: {project_description}

        Please respond in Korean.
        """

        messages = [
            {"role": "system", "content": "You are a helpful interview question generator."},
            {"role": "user", "content": prompt_content}
        ]

    else:
        return jsonify({"error": "Invalid type selected"}), 400

    response = openai.ChatCompletion.create(
        model='gpt-3.5-turbo',
        messages=messages,
        temperature=0.5
    )

    content = response['choices'][0]['message']['content']

    # content 출력하여 확인
    print("Generated content:", content)

    try:
        parsed_content = json.loads(content)
    except json.JSONDecodeError as e:
        return jsonify({"error": f"JSON decoding error: {e}", "content": content}), 400

    return jsonify(parsed_content)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
    #app.run(host='0.0.0.0', port=80, debug=False)

#TODO: question api 요청 내용 튜닝. ex) 면접관의 입장에서, 자기소개서의 내용으로 질문
#TODO: 요청 한번 하면 Frontend에서 1분 대기시간 주기, Backend도.
#TODO: 문자열 길이 체크