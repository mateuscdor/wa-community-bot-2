import shutil
import sys
import speech_recognition as sr
import sys
import os
from pydub import AudioSegment
from pydub.silence import split_on_silence

folder_dir = os.path.join(
    os.path.dirname(__file__)) + '/'

chunks_folder = f'{folder_dir}chunks'
inputs_folder = f'{folder_dir}inputs'


def main():
    args = sys.argv[1:]
    if (len(args) < 3):
        raise Exception(
            "Invalid arguments. Must provide path to audio file, jid and msg_id")

    input_path = str(args[0])
    jid = str(args[1])
    msg_id = str(args[2])
    recognizer = sr.Recognizer()

    if not input_path.endswith(".wav"):
        AudioSegment.from_ogg(input_path).export(
            input_path.replace(".ogg", ".wav"), format="wav")

        # delete ogg file
        os.remove(input_path)
        input_path = input_path.replace(".ogg", ".wav")

    chunk_folder = get_chunk_folder(jid, msg_id)
    if not os.path.exists(chunks_folder):
        os.mkdir(chunks_folder)

    if os.path.exists(chunk_folder):
        shutil.rmtree(chunk_folder)

    if not os.path.exists(input_path):
        print("Could not find audio file")
        sys.stdout.flush()
        return
    else:
        # copy input file to inputs folder
        if not os.path.exists(inputs_folder):
            os.mkdir(inputs_folder)
        new_input = f'{inputs_folder}/{jid}-{msg_id}.wav'
        shutil.copy(input_path, new_input)
        input_path = new_input

    os.mkdir(chunk_folder)
    res = speech_to_text(input_path, chunk_folder, recognizer)
    sys.stdout.buffer.write(res)
    sys.stdout.flush()

    shutil.rmtree(chunk_folder)
    os.remove(input_path)


def speech_to_text(input, chunk_folder, recognizer):
    audio = AudioSegment.from_ogg(input)
    chunks = split_on_silence(
        audio, min_silence_len=500, silence_thresh=-50, keep_silence=500)

    stt: str = ""
    for i, chunk in enumerate(chunks):
        chunk_path = get_chunck_path(chunk_folder, i)
        chunk.export(chunk_path, format="wav")

        audio_data: sr.AudioFile
        with sr.AudioFile(chunk_path) as src:
            audio_data = recognizer.record(src)

        if audio_data is None:
            return "Audio file is empty"

        try:
            text = recognizer.recognize_google(audio_data, language="he")
            stt += text
        except sr.UnknownValueError:
            return "Google Speech Recognition could not understand audio"
        except sr.RequestError as e:
            return "Could not request results from Google Speech Recognition service; {0}".format(e)

    return stt.encode('utf-8')


def get_chunk_folder(jid, msg_id):
    return f'{folder_dir}chunks/{jid}-{msg_id}'


def get_chunck_path(folder, i):
    return f'{folder}/chunk{i}.wav'


if __name__ == '__main__':
    main()
