import re


def mask_sensitive_data(text: str) -> str:
    """
    텍스트 내부의 주요 민감정보(API Key, 주민등록번호, 계좌/카드번호, 전화번호)를 감지하여
    *** 형태로 마스킹 처리합니다.
    """
    if not text:
        return ""

    masked_text = text

    # 1. API Key (sk-, key-, ghp_ 등)
    masked_text = re.sub(
        r'(sk-[a-zA-Z0-9]{8,}|key-[a-zA-Z0-9]{8,}|ghp_[a-zA-Z0-9]{8,})',
        lambda m: m.group(1)[:5] + '***',
        masked_text
    )

    # 2. 주민등록번호 (예: 900101-1234567)
    masked_text = re.sub(
        r'(\d{6})[-s]?(\d{7})',
        r'\1-*******',
        masked_text
    )

    # 3. 전화번호 (예: 010-1234-5678)
    masked_text = re.sub(
        r'(\d{2,3})[-s]?(\d{3,4})[-s]?(\d{4})',
        r'\1-****-\3',
        masked_text
    )

    # 4. 카드번호 (예: 1234-5678-1234-5678)
    masked_text = re.sub(
        r'(\d{4})[-s]?(\d{4})[-s]?(\d{4})[-s]?(\d{4})',
        r'\1-****-****-\4',
        masked_text
    )

    return masked_text