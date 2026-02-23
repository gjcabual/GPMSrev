def get_text_from_file(text_output_path):
    """Read text from a file"""
    with open(text_output_path, 'r', encoding='utf-8') as f:
        return f.read()