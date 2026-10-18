#!/bin/bash
set -euo pipefail
dir=/home/user/todo-app
rm -rf "$dir"
mkdir -p "$dir"
cat > "$dir/todo.py" <<'END'
"""A tiny to-do list."""

items = []


def add(text):
    items.append({"text": text, "done": False})
    return len(items)


def complete(number):
    items[number - 1]["done"] = True


if __name__ == "__main__":
    add("Write the README")
    for i, item in enumerate(items, 1):
        print(i, "[x]" if item["done"] else "[ ]", item["text"])
END
cat > "$dir/test_todo.py" <<'END'
import todo


def test_add_returns_position():
    todo.items.clear()
    assert todo.add("buy milk") == 1
END
chown -R user:user "$dir"
