"""
Контрольные вопросы после этапа — общая часть движков lab_task.py (№6–9) и terminal_task.py (№5).

Когда все пункты этапа выполнены, задаются вопросы по работе студента (обычно 2, 60 секунд на каждый,
ответ — `answer q НОМЕР`). Этап засчитывается после ответа на все; неверный или просроченный ответ
записывается (в №8–9 он уменьшает баллы этапа), но этап не держит.

Состояние лежит в progress["defense"][str(k)] = {"qs": [...], "i": номер текущего, "asked_at", "results"};
progress["_ask"] = k — вопросы только что заданы (терминал печатает первый).
Вопрос: {"text", "options": [...], "correct": индекс верного}.
"""

import random
import time

DEFENSE_SECONDS = 60
NOW = time.time          # подменяется в тестах (lab_task.NOW пробрасывается сюда)


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _now():
    return NOW()


def question(rng, text, options):
    """Варианты перемешиваются; верный — первый в описании."""
    order = list(range(len(options)))
    rng.shuffle(order)
    return {"text": text, "options": [options[i] for i in order], "correct": order.index(0)}


def rng_for(params, k, salt=""):
    return random.Random(f"{params.get('seed', '')}-{k}-{salt}-{_now()}")


def gate(progress, k, make_questions):
    """Можно ли засчитать этап k, у которого выполнены все пункты. Задаёт вопросы при первом вызове."""
    state = progress.setdefault("defense", {}).get(str(k))
    if state is None:
        try:
            questions = make_questions() or []
        except Exception:  # noqa: BLE001 — без вопросов этап не должен застревать
            questions = []
        progress["defense"][str(k)] = {"qs": questions, "i": 0, "asked_at": _now(), "results": []}
        if questions:
            progress["_ask"] = k
            return False
        return True
    return state["i"] >= len(state["qs"])


def pending(progress):
    k = progress["done"] + 1
    state = progress.get("defense", {}).get(str(k))
    if state and state["i"] < len(state["qs"]):
        return k, state
    return None, None


def text(progress):
    k, state = pending(progress)
    if state is None:
        return None
    q = state["qs"][state["i"]]
    left = max(0, int(DEFENSE_SECONDS - (_now() - state.get("asked_at", _now()))))
    lines = [f"[Контрольный вопрос {state['i'] + 1} из {len(state['qs'])}, этап {k}] {q['text']}"]
    lines += [f"  {n}) {opt}" for n, opt in enumerate(q["options"], 1)]
    lines.append(f"Ответ: answer q НОМЕР_ВАРИАНТА — осталось {left} с. Изменить ответ нельзя, "
                 "просрочка считается неверным ответом.")
    return "\n".join(lines)


def answer(progress, args):
    k, state = pending(progress)
    if state is None:
        return "answer q: сейчас контрольного вопроса нет.", False
    if len(args) < 2 or not args[1].strip().isdigit():
        return "Использование: answer q НОМЕР_ВАРИАНТА, например: answer q 2", False
    q = state["qs"][state["i"]]
    late = _now() - state.get("asked_at", _now()) > DEFENSE_SECONDS
    choice = int(args[1]) - 1
    ok = (not late) and choice == q["correct"]
    state["results"].append({"q": q["text"], "choice": choice, "correct": q["correct"], "ok": ok,
                             "late": late, "seconds": round(_now() - state.get("asked_at", _now()), 1),
                             "at": now_iso()})
    state["i"] += 1
    state["asked_at"] = _now()
    head = "⏱ Время вышло — ответ не засчитан." if late else ("✔ Принято." if ok else "Принято.")
    if state["i"] < len(state["qs"]):
        return head + "\n" + text(progress), True
    good = all(r["ok"] for r in state["results"])
    return head + (" Контрольные вопросы этапа пройдены." if good else
                   " Не на все контрольные вопросы дан верный ответ: этап засчитан частично, "
                   "преподаватель проверит устно."), True


def is_defense_answer(args):
    return bool(args) and args[0].lower() in ("q", "к")


def from_bank(bank, k, params, n=2, first=None):
    """Вопросы этапа k из банка {k: [(текст, [верный, неверные...])]}; first — уже готовый вопрос."""
    rng = rng_for(params, k, "bank")
    qs = [first] if first else []
    items = list(bank.get(k, []))
    rng.shuffle(items)
    for q_text, options in items[: max(0, n - len(qs))]:
        qs.append(question(rng, q_text, options))
    return qs


def command_question(rng, value, qid, line, decoys):
    """«Какой командой вы впервые получили значение …» — line из «следов» вывода студента."""
    decoys = [d for d in decoys if d != line]
    rng.shuffle(decoys)
    if len(decoys) < 3:
        return None
    return question(rng, f"Какой командой вы впервые получили значение «{value}» (ответ {qid})?",
                    [line] + decoys[:3])
