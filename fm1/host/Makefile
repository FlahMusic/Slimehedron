# Host build of the FM-1 core (Linux / WSL gcc). The device build lives with the firmware base, once Flah picks one.
#   make            both builds   make check   compare to the web's numbers and draw a test frame
CFLAGS = -std=c99 -O2 -Wall -Wextra -Werror -Wno-unused-parameter
SRC = ../core/solid.c ../core/draw.c main.c

all: solidtest_double solidtest_float spacetest_double spacetest_float

spacetest_double: ../core/space.c ../core/space.h ../core/drawspace.c ../core/drawspace.h spacetest.c
	$(CC) $(CFLAGS) -DSH_REAL=double -o $@ ../core/space.c ../core/drawspace.c spacetest.c -lm

spacetest_float: ../core/space.c ../core/space.h ../core/drawspace.c ../core/drawspace.h spacetest.c
	$(CC) $(CFLAGS) -DSH_REAL=float -o $@ ../core/space.c ../core/drawspace.c spacetest.c -lm

space: spacetest_double spacetest_float
.PHONY: space

melodytest: ../core/melody.c ../core/melody.h melodytest.c
	$(CC) $(CFLAGS) -o $@ ../core/melody.c melodytest.c -lm

melody: melodytest
	./melodytest ../../vst/slimehedron-core/src/tank/melody_golden.txt
.PHONY: melody

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

# the minis answer a hand, the cast celebrates a burst (firmware/slime_minis.h): make minis
minitest: minitest.c ../firmware/slime_minis.h
	$(CC) $(CFLAGS) -o $@ minitest.c -lm
minis: minitest
	./minitest

TANKSRC = ../core/tank.c ../core/goo.c ../core/music.c ../core/melody.c
tanktest: $(TANKSRC) ../core/tank.h ../core/goo.h ../core/music.h ../core/melody.h tanktest.c
	$(CC) $(CFLAGS) -o $@ $(TANKSRC) tanktest.c -lm

# the C tank and the plugin's tank through the same scenes; then: node fm1/host/check-tank.js
tank: tanktest
	./tanktest scenes.txt > tank_c.txt
	CARGO_TARGET_DIR=$$HOME/fm1-tankref $$HOME/.cargo/bin/cargo build --release -q --manifest-path tankref/Cargo.toml
	$$HOME/fm1-tankref/release/tankref scenes.txt > tank_rust.txt
.PHONY: tank

# the same tank with the goo's grids hashed: must still match the plugin exactly (check-tank.js tank_hashed.txt)
tanktest_hashed: $(TANKSRC) ../core/tank.h ../core/goo.h ../core/music.h ../core/melody.h tanktest.c
	$(CC) $(CFLAGS) -DSH_GOO_HASHED -o $@ $(TANKSRC) tanktest.c -lm

# the device's light goo (float, half the drops at 2^(1/3) the size): checked by statistics (check-goolight.js)
tanktest_light: $(TANKSRC) ../core/tank.h ../core/goo.h ../core/music.h ../core/melody.h tanktest.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -fsingle-precision-constant -c -o goo_light.o ../core/goo.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -o $@ ../core/tank.c ../core/music.c ../core/melody.c goo_light.o tanktest.c -lm

goo: tanktest tanktest_hashed tanktest_light
	./tanktest_hashed scenes.txt > tank_hashed.txt
	./tanktest_light scenes.txt > tank_light.txt
.PHONY: goo

# the 16 seeds through the exact goo and the light one; then: node fm1/host/check-goolight.js
tanktest_quarter: $(TANKSRC) ../core/tank.h ../core/goo.h tanktest.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -DSH_GOO_DIV=4 -fsingle-precision-constant -c -o goo_quarter.o ../core/goo.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -DSH_GOO_DIV=4 -o $@ ../core/tank.c ../core/music.c ../core/melody.c goo_quarter.o tanktest.c -lm

goo-stats: tanktest tanktest_light tanktest_quarter
	./tanktest scenes-goo.txt > goo_exact.txt
	./tanktest_light scenes-goo.txt > goo_light.txt
	./tanktest_quarter scenes-goo.txt > goo_quarter.txt
.PHONY: goo-stats

# the normal tank drawn 2.5D on the light goo, three camera turns: checks and tankN.ppm (node check-drawtank.js: PNGs)
drawtanktest: ../core/drawtank.c ../core/drawtank.h ../core/paint.h $(TANKSRC) ../core/tank.h ../core/goo.h drawtanktest.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -fsingle-precision-constant -c -o goo_light.o ../core/goo.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -o $@ ../core/drawtank.c ../core/tank.c ../core/music.c ../core/melody.c goo_light.o drawtanktest.c -lm

draw: drawtanktest
	./drawtanktest .
.PHONY: draw

# portal space: the web's dev-portal checks as numbers, on the light goo
portaltest: $(TANKSRC) ../core/tank.h ../core/goo.h portaltest.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -fsingle-precision-constant -c -o goo_light.o ../core/goo.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -o $@ ../core/tank.c ../core/music.c ../core/melody.c goo_light.o portaltest.c -lm

portal: portaltest
	./portaltest
.PHONY: portal

bandtest: ../core/band.c ../core/band.h ../core/band_tables.h ../core/music.c bandtest.c
	$(CC) $(CFLAGS) -DSH_BAND_TEST -o $@ ../core/band.c ../core/music.c bandtest.c -lm

band: bandtest

# the FM-1's goo since 2026-11-18 (SH_GOO_DIV=16: a hundred drops, the same volume) and the wall guard
tanktest_16: $(TANKSRC) ../core/tank.h ../core/goo.h tanktest.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -DSH_GOO_DIV=16 -fsingle-precision-constant -c -o goo_16.o ../core/goo.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -DSH_GOO_DIV=16 -o $@ ../core/tank.c ../core/music.c ../core/melody.c goo_16.o tanktest.c -lm

goo16: tanktest tanktest_16
	./tanktest scenes-goo.txt > goo_exact.txt
	./tanktest_16 scenes-goo.txt > goo_16.txt
	GOO=goo_16.txt node check-goolight.js
.PHONY: goo16

# no note stuck ringing a wall: every shape, spin and space, the goo full (stucktest.c); `make stuck` must PASS
stucktest: $(TANKSRC) ../core/tank.h ../core/goo.h stucktest.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -DSH_GOO_DIV=16 -fsingle-precision-constant -c -o goo_16.o ../core/goo.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -DSH_GOO_DIV=16 -o $@ ../core/tank.c ../core/music.c ../core/melody.c goo_16.o stucktest.c -lm

stuck: stucktest
	./stucktest 1
	NOHANDS=1 ./stucktest 1
.PHONY: stuck

# wall HP, the FM-1's (walltest.c): a wall breaks on its own hits, opens 2 bars, notes fall out; `make walls` must PASS
walltest: $(TANKSRC) ../core/tank.h ../core/goo.h walltest.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -DSH_GOO_DIV=16 -fsingle-precision-constant -c -o goo_16.o ../core/goo.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -DSH_GOO_DIV=16 -o $@ ../core/tank.c ../core/music.c ../core/melody.c goo_16.o walltest.c -lm

walls: walltest
	./walltest
.PHONY: walls

# the band's other harmony owners (a hand, a progression) and a person's drum pattern: `make harm` must PASS
harmtest: ../core/band.c ../core/band.h ../core/band_tables.h ../core/music.c harmtest.c
	$(CC) $(CFLAGS) -o $@ ../core/band.c ../core/music.c harmtest.c -lm

harm: harmtest
	./harmtest
.PHONY: harm

synctest: $(TANKSRC) ../core/tank.h ../core/goo.h synctest.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -DSH_GOO_DIV=16 -fsingle-precision-constant -c -o goo_16.o ../core/goo.c
	$(CC) $(CFLAGS) -DSH_GOO_LIGHT -DSH_GOO_DIV=16 -o $@ ../core/tank.c ../core/music.c ../core/melody.c goo_16.o synctest.c -lm
