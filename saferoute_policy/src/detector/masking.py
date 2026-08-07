import re

def mask_sensitive_data(text: str) -> str:
    """
    텍스트 내부의 주요 민감정보(API Key, 주민등록번호, 계좌번호 등)를 감지하여
    *** 형태로 마스킹 처리합니다.
    """
    if not text:
        return ""

    masked_text = text

    # 1. API Key (예: sk- 또는 key- 로 시작하는 영문숫자 조합)
    masked_text = re.sub(
        r'(sk-[a-zA-Z0-9]{8,}|key-[a-zA-Z0-9]{8,})',
        r'\1'[:5] + '***',
        masked_text
    )

    # 2. 주민등록번호 (예: 900101-1234567)
    masked_text = re.sub(
        r'(\d{6})[-s]?(\d{7})',
        r'\1-*******',
        masked_text
    )

    # 3. 이메일 주소 (예: abc@domain.com -> a***@domain.com)
    masked_text = re.sub(
        r'([a-zA-Z0-9._%+-]{1,2})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
        r'\1***@\2',
        masked_text
    )

    return masked_text