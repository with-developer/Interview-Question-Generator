function updateCounter(element, limit, counterId) {
    const counter = document.getElementById(counterId);
    const currentLength = element.value.length;

    if (currentLength > limit) {
        element.value = element.value.substring(0, limit);
    }

    counter.textContent = `${element.value.length} / ${limit}`;
}

let timerInterval; // 타이머를 저장할 변수
$('#personal-statement-form').submit(function (e) {
    e.preventDefault();

    $("#generate-button").prop("disabled", true);
    $("#loading-message").show();

    let timeLeft = 60;
    timerInterval = setInterval(function () {
        $("#generate-button").text(`다음 질문 생성 가능: ${timeLeft}s`);
        timeLeft -= 1;

        if (timeLeft < 0) {
            clearInterval(timerInterval);
            $("#generate-button").text("질문 생성");
            $("#generate-button").prop("disabled", false);
        }
    }, 1000);

    // 공통으로 사용되는 job_position 값
    let job_position = $('#job_position').val();
    let isValid = true;
    let missingFields = [];


    // 현재 선택된 select option
    let selectedValue = $("#type-select").val();

    // 데이터 초기화
    let dataToSend = {
        job_position: job_position,
        type: selectedValue
    };
    // 공통 필드 검증
    if ($('#job_position').val() === '') {
        isValid = false;
        missingFields.push('지원하려는 직무');
    }

    // 자기소개서가 선택되어 있는 경우
    if (selectedValue === "personal_statement_form") {
        if ($('#introduction-article').val() === '') {
            isValid = false;
            missingFields.push('자기소개서 항목');
        }
        if ($('#personal_statement').val() === '') {
            isValid = false;
            missingFields.push('자기소개서');
        }
    }
    // 프로젝트가 선택되어 있는 경우
    else if (selectedValue === "project") {
        if ($('#project_title').val() === '') {
            isValid = false;
            missingFields.push('프로젝트 제목');
        }
        if ($('#project_description').val() === '') {
            isValid = false;
            missingFields.push('프로젝트 설명');
        }
    }

    if (!isValid) {
        $("#loading-message").hide();
        clearInterval(timerInterval); // 타이머를 초기화
        $("#generate-button").text("질문 생성");
        $("#generate-button").prop("disabled", false); // 버튼을 다시 활성화
        alert('다음 필드가 누락되었습니다: ' + missingFields.join(', '));
        return;
    }

    // 자기소개서가 선택되어 있는 경우
    if (selectedValue === "personal_statement_form") {
        dataToSend.introduction_article = $('#introduction-article').val();
        dataToSend.personal_statement = $('#personal_statement').val();
    }
    // 프로젝트가 선택되어 있는 경우
    else if (selectedValue === "project") {
        dataToSend.project_title = $('#project_title').val();
        dataToSend.project_description = $('#project_description').val();
    }

    // 백엔드로 데이터 전송
    $.post('/generate_questions', dataToSend)
        .done(function (data) {
            // "생성된 질문" 제목 추가
            let questionsHtml = '<h3>생성된 질문</h3>';

            data.questions.forEach(function (q, index) {
                questionsHtml += `
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading${index}">
          <button type="button" class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
            ${index + 1}. ${q.question}
          </button>
        </h2>
        <div id="collapse${index}" class="accordion-collapse collapse"> <!-- data-bs-parent 속성 제거 -->
          <div class="card-body" style="text-align: initial;">
            <p>답변 팁: ${q.tip}</p>
          </div>
        </div>
      </div>
    `;
            });
            $("#loading-message").hide();
            $('#questions').html(questionsHtml);
            $('#save-button-div').show();
            toastr.success('질문 생성이 완료되었습니다.');
        })
        .fail(function (jqXHR) {
            // 실패 시 에러 메시지 출력
            let errorMsg = "알 수 없는 오류가 발생했습니다.";
            if (jqXHR.status === 429) {
                errorMsg = "1분에 1번의 요청만 가능합니다.";
            } else if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                errorMsg = jqXHR.responseJSON.error;
            }
            alert(errorMsg);
            $("#loading-message").hide();
            clearInterval(timerInterval); // 타이머를 초기화
            $("#generate-button").text("질문 생성");
            $("#generate-button").prop("disabled", false); // 버튼을 다시 활성화
        });
});

$(document).ready(function () {
    // 초기 상태 설정 (자기소개서 입력칸이 기본으로 보이도록)
    $("#project-section").hide();
    setRequiredFields('personal_statement_form');

    // select 태그의 변경을 감지
    $("#type-select").change(function () {
        var selectedValue = $(this).val();
        setRequiredFields(selectedValue); // required 속성 설정

        if (selectedValue === "personal_statement_form") {
            $("#personal-statement-section").show();
            $("#project-section").hide();
        } else if (selectedValue === "project") {
            $("#personal-statement-section").hide();
            $("#project-section").show();
        }
    });
});

// required 속성을 동적으로 설정
function setRequiredFields(selectedValue) {
    if (selectedValue === 'personal_statement_form') {
        $('#introduction-article').prop('required', true);
        $('#personal_statement').prop('required', true);
        $('#project_title').prop('required', false);
        $('#project_description').prop('required', false);
    } else if (selectedValue === 'project') {
        $('#introduction-article').prop('required', false);
        $('#personal_statement').prop('required', false);
        $('#project_title').prop('required', true);
        $('#project_description').prop('required', true);
    }
}

// Toastr 설정
toastr.options = {
    "positionClass": "toast-bottom-center",
    // 추가적으로 원하는 설정을 여기에 넣을 수 있습니다.
};

// 클립보드 복사 버튼 이벤트 핸들러
$('#copy-to-clipboard').click(function () {
    let copyText = '';
    $('#questions .accordion-item').each(function (index) {
        let question = $(this).find('.accordion-button').text().trim();
        let tip = $(this).find('.card-body p').text().trim();

        copyText += `${question}\n`;
        copyText += `${tip}\n\n`;
    });
    // 클립보드에 복사
    navigator.clipboard.writeText(copyText).then(function () {
        // Toastr 메시지 띄우기
        toastr.success('결과가 클립보드에 복사되었습니다.');
    }).catch(function (err) {
        toastr.error('클립보드 복사에 실패했습니다.');
    });
});

document.getElementById("save-question-image").addEventListener("click", function () {
    // 모든 collapse를 확장
    $('#questions .collapse').collapse('show');

    // 약간의 딜레이를 줘서 모든 collapse가 확장되고 나서 스크린샷을 찍습니다.
    setTimeout(function () {
        const questionsDiv = document.getElementById("questions");
        html2canvas(questionsDiv).then(function (canvas) {
            // 캔버스를 이미지로 변환
            const imgData = canvas.toDataURL("image/png");

            // 이미지를 다운로드
            const link = document.createElement("a");
            link.href = imgData;
            link.download = "questions.png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }, 500); // 500ms 딜레이를 줍니다. 필요하다면 이 값을 조절할 수 있습니다.
});
document.getElementById('fill-test-data').addEventListener('click', function () {
    // 테스트 데이터 채워넣기
    document.getElementById('job_position').value = '보안 개발자';
    document.getElementById('introduction-article').value = '본 직군으로 지원을 결정하시게 된 계기를 작성해주세요.';
    document.getElementById('personal_statement').value = `지원한 동기
저는 컴퓨터 공학을 전공하면서 보안 분야에 특별한 관심을 가지고 여러 프로젝트와 연구에 참여하였습니다. 대학 시절, 제가 참여한 보안 연구 프로젝트가 국내외 학술대회에서 상을 받은 경험은 저에게 큰 자신감과 동기를 부여하였습니다. 이러한 경험을 통해 보안 개발자로서의 역량을 계속해서 키우고 싶다는 판단을 하게 되었습니다.

귀사는 보안 분야에서의 선도적인 역할을 하고 있으며, 지속적인 연구와 개발을 통해 많은 성과를 이루고 계십니다. 특히, 귀사의 '보안 프레임워크 개발 프로젝트'는 업계에서도 주목을 받고 있어, 이에 대한 깊은 관심을 느꼈습니다. 저는 이런 동기로 귀사에 지원하게 되었고, 제 역량과 열정을 바탕으로 팀과 회사에 기여하고자 합니다.

입사 후 포부
입사 후에는 먼저 귀사의 보안 시스템과 프로젝트에 빠르게 적응하여 실력을 뽐내고자 합니다. 초반에는 선배 개발자님들과 긴밀히 협력하면서 실무 역량을 키워 나갈 계획입니다. 또한, 저는 보안 분야에서 발생하는 새로운 위협과 공격 패턴을 지속적으로 모니터링하여, 회사의 보안 체계를 더욱 견고하게 만드는 데 기여하고 싶습니다.

장기적으로는 귀사에서 진행하는 R&D 프로젝트에 참여하여, 보안 기술의 신규 개발 및 기존 시스템의 업그레이드에 기여하고 싶습니다. 특히, 인공지능과 블록체인 기술을 활용한 보안 솔루션 개발에 관심이 있어, 이런 분야에서의 연구를 추진하고 싶습니다.

결론적으로, 저는 귀사의 보안 개발자로서 회사의 성장과 발전에 기여할 수 있는 역량과 노하우를 지니고 있습니다. 이를 통해 귀사, 그리고 보안 분야 전체에 긍정적인 영향을 끼치는 전문가가 되고자 하는 것이 제 포부입니다.

감사합니다.
[홍 길동]`;

    // 미리 설정된 면접 질문 출력
    let questionsHtml = '<h3>생성된 질문</h3>';
    // 미리 설정된 면접 질문과 답변 팁
    let presetQuestions = [
        {
            question: '보안 분야에 대한 관심과 경험을 더 자세히 알려주세요.',
            tip: '이 질문에서는 지원자의 보안 분야에 대한 지식과 경험을 알아보고자 합니다. 자신의 관심과 경험에 대해 구체적으로 이야기해보세요.'
        },
        {
            question: '보안 연구 프로젝트에서 어떤 역할을 맡았나요? 어떤 성과를 이루었나요?',
            tip: '이 질문에서는 지원자의 보안 연구 프로젝트에 대한 참여 경험과 성과에 대해 알아보고자 합니다. 자신의 역할과 프로젝트에서 이룬 성과에 대해 구체적으로 설명해보세요.'
        },
        {
            question: '왜 우리 회사에 지원하게 되었는지 알려주세요.',
            tip: '이 질문에서는 지원자가 우리 회사에 대해 얼마나 알고 있는지, 그리고 왜 우리 회사에 지원하게 되었는지를 알아보고자 합니다. 회사에 대한 연구를 통해 구체적인 이유를 준비해보세요.'
        },
        {
            question: '입사 후에 어떤 목표를 가지고 있나요?',
            tip: '이 질문에서는 지원자가 입사 후에 어떤 목표를 가지고 있는지 알아보고자 합니다. 입사 후에 어떤 역할을 수행하고 싶은지, 어떤 분야에서 성장하고 싶은지 등을 구체적으로 설명해보세요.'
        },
        {
            question: '보안 분야에서의 최신 동향과 관련된 새로운 기술에 대해 알려주세요.',
            tip: '이 질문에서는 지원자가 보안 분야에서의 최신 동향과 관련된 새로운 기술에 대해 얼마나 알고 있는지 알아보고자 합니다. 최신 동향과 관련된 기술에 대해 조사하고 구체적으로 이야기해보세요.'
        },
        {
            question: 'R&D 프로젝트에 참여하여 기여하고 싶은 분야가 있다면 알려주세요.',
            tip: '이 질문에서는 지원자가 R&D 프로젝트에 참여하여 어떤 분야에서 기여하고 싶은지 알아보고자 합니다. 자신이 관심을 가지고 있는 분야와 그 분야에서의 기여 방안에 대해 구체적으로 이야기해보세요.'
        },
        {
            question: '귀사의 보안 시스템을 개선하기 위해 어떤 방법을 사용할 수 있을까요?',
            tip: '이 질문에서는 지원자가 귀사의 보안 시스템을 개선하기 위해 어떤 방법을 사용할 수 있는지 알아보고자 합니다. 자신이 생각하는 보안 시스템 개선 방법과 그 이유에 대해 구체적으로 설명해보세요.'
        }
    ];


    presetQuestions.forEach(function (q, index) {
        questionsHtml += `
    <div class="accordion-item">
      <h2 class="accordion-header" id="heading${index}">
        <button type="button" class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
          ${index + 1}. ${q.question}
        </button>
      </h2>
      <div id="collapse${index}" class="accordion-collapse collapse">
        <div class="card-body" style="text-align: initial;">
          <p>답변 팁: ${q.tip}</p>
        </div>
      </div>
    </div>
  `;
    });

    document.getElementById('questions').innerHTML = questionsHtml;
    $('#save-button-div').show();
});
document.querySelector('.nav-masthead').addEventListener('click', function (event) {
    const navLinks = document.querySelectorAll('.nav-link');

    // Remove active class from all links
    navLinks.forEach(navLink => navLink.classList.remove('active'));

    // Add active class to the clicked link
    event.target.classList.add('active');

    if (event.target.textContent === "Features") {
        // Hide main content and show features content
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('featuresContent').style.display = 'block';
    } else if (event.target.textContent === "Home") {
        // Show main content and hide features content
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('featuresContent').style.display = 'none';
    }
});