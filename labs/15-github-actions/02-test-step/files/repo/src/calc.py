"""A tiny calculator used to practise CI pipelines."""
import sys


def add(a, b):
    return a + b


def subtract(a, b):
    return a - b


def multiply(a, b):
    return a * b


def divide(a, b):
    if b == 0:
        raise ValueError("cannot divide by zero")
    return a / b


OPERATIONS = {"+": add, "-": subtract, "x": multiply, "/": divide}


def main():
    if len(sys.argv) != 4 or sys.argv[2] not in OPERATIONS:
        print("usage: calculator.pyz <number> <+|-|x|/> <number>", file=sys.stderr)
        sys.exit(2)
    a, op, b = float(sys.argv[1]), sys.argv[2], float(sys.argv[3])
    result = OPERATIONS[op](a, b)
    print(int(result) if result == int(result) else result)


if __name__ == "__main__":
    main()
