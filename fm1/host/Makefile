# Host build of the FM-1 core (Linux / WSL gcc). The device build lives with the firmware base, once Flah picks one.
#   make            both builds   make check   compare to the web's numbers and draw a test frame
CFLAGS = -std=c99 -O2 -Wall -Wextra -Werror -Wno-unused-parameter
SRC = ../core/solid.c ../core/draw.c main.c

all: solidtest_double solidtest_float

solidtest_double: $(SRC) ../core/solid.h ../core/draw.h
	$(CC) $(CFLAGS) -DSH_REAL=double -o $@ $(SRC) -lm

solidtest_float: $(SRC) ../core/solid.h ../core/draw.h
	$(CC) $(CFLAGS) -DSH_REAL=float -o $@ $(SRC) -lm

check: all
	./solidtest_double dump > dump_double.json
	./solidtest_float dump > dump_float.json
	./solidtest_float render orb93 93 orb93.ppm
	./solidtest_float render icosa.cut 32 icosa_cut.ppm

clean:
	rm -f solidtest_double solidtest_float dump_*.json *.ppm
