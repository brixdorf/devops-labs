from labcheck import Checker, context, ensure, exists, lines, quote

ANSWER = "/home/user/answer.txt"
hidden = context().get("hidden", "")
c = Checker()
expected = [
    ("Task 1: current directory", "/home/user"),
    ("Task 2: command to change directory", "cd"),
    ("Task 3: command to list directory contents", "ls"),
    ("Task 4: hidden file name", hidden),
]


def answers():
    return [line.strip() for line in lines(ANSWER, "the file /home/user/answer.txt")]


@c.test("answer.txt exists in /home/user")
def _():
    ensure(exists(ANSWER), f"Expected {ANSWER} but it was not found")
    return f"Found {ANSWER}"


@c.test("answer.txt has exactly four answers", requires=["answer.txt exists in /home/user"])
def _():
    got = answers()
    ensure(len(got) == 4, f"Expected 4 lines but found {len(got)}")
    return "Found 4 lines"


for index, (name, value) in enumerate(expected):

    @c.test(name, requires=["answer.txt exists in /home/user"])
    def _(index=index, value=value):
        got = answers()
        ensure(len(got) > index, f"Expected line {index + 1} to be {quote(value)} but the file has only {len(got)} lines")
        ensure(got[index] == value, f"Expected {quote(value)} but found {quote(got[index])} on line {index + 1}")
        return f"Line {index + 1} is {quote(value)}"


c.run()
