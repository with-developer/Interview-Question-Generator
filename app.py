from flask import Flask, render_template, request, jsonify
from flask_limiter import Limiter, util
import openai
import os
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
error_logger = logging.getLogger('error')
error_logger.addHandler(logging.FileHandler('/var/log/flask_error.log'))
success_logger = logging.getLogger('success')
success_logger.addHandler(logging.FileHandler('/var/log/flask_success.log'))

app = Flask(__name__)

# Limiter 객체 한 번만 생성
limiter = Limiter(key_func=util.get_remote_address, app=app)

API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = API_KEY

# Check if API Key is available
# if API_KEY is None:
#     raise EnvironmentError("Missing OPENAI_API_KEY environment variable")

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/generate_questions', methods=['POST'])
@limiter.limit("1 per minute")  # 분당 1회 요청으로 제한
def generate_questions():
    type_selected = request.form.get('type')
    job_position = request.form.get('job_position')

    if not type_selected or not job_position:
            return jsonify({"error": "값을 입력해주세요."}), 400

    # Validate string lengths
    if len(job_position) == 0:
        return jsonify({"error": "값을 입력해주세요."}), 400
    elif len(job_position) > 100:
        return jsonify({"error": "직무란은 100자를 초과할 수 없습니다."}), 400

    if type_selected == "personal_statement_form":
        introduction_article = request.form.get('introduction_article')
        personal_statement = request.form.get('personal_statement')
        if len(introduction_article) == 0 or len(personal_statement) == 0:
            return jsonify({"error": "값을 입력해주세요."}), 400
        elif len(introduction_article) > 300:
            return jsonify({"error": "자기소개서 항목란은 300자를 초과할 수 없습니다."}), 400
        elif len(personal_statement) > 2000:
            return jsonify({"error": "자기소개서 내용란은 2000자를 초과할 수 없습니다."}), 400

        prompt_content = f"""
        You're a hiring manager looking for a new {job_position} to join your team. Based on the following cover letter, generate 7 interview questions and tips for each question. Please provide your response in JSON format with the following schema:
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
        if len(project_title) == 0 or len(project_description) == 0:
            return jsonify({"error": "값을 입력해주세요."}), 400
        elif len(project_title) > 300:
            return jsonify({"error": "프로젝트 제목란은 300자를 초과할 수 없습니다."}), 400
        elif len(project_description) > 2000:
            return jsonify({"error": "프로젝트 설명란은 2000자를 초과할 수 없습니다."}), 400

        prompt_content = f"""
        You're a hiring manager looking for a new {job_position} to join your team. Based on the cover letter about this project, generate 7 interview questions and tips for each question. Please provide your response in JSON format with the following schema:
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

    try:
        response = openai.ChatCompletion.create(
            model='gpt-3.5-turbo',
            messages=messages,
            temperature=0.5
        )
    except Exception as e:
        error_message = f"OpenAI API error: {str(e)}"
        error_logger.error(error_message)
        return jsonify({"error": f"OpenAI API error: {str(e)}"}), 500

    content = response.get('choices', [{}])[0].get('message', {}).get('content', "")

    # content 출력하여 확인
    print("Generated content:", content)

    try:
        parsed_content = json.loads(content)
    except Exception as e:
        error_message = f"JSON parsing error: {str(e)}"
        error_logger.error(error_message)
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    success_logger.info(f"Successfully generated questions for type {type_selected}")
    return jsonify(parsed_content)


@app.route('/sitemap.xml')
def sitemap():
    return render_template('sitemap.xml')


@app.route('/robots.txt')
def robots():
    return render_template('robots.txt')

@app.route('/Ads.txt')
def Ads():
    return render_template('Ads.txt')


if __name__ == '__main__':
    #pass
    app.run(host='0.0.0.0', debug=True)
    #app.run(host='0.0.0.0', port=80, debug=False)


#TODO: 텍스트 복사: OK
#TODO: 이미지 저장: OK
#TODO: Test Data Set: OK
#TODO: 에러 핸들링 추가