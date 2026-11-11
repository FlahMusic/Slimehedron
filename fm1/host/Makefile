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
goo-stats: tanktest tanktest_light
	./tanktest scenes-goo.txt > goo_exact.txt
	./tanktest_light scenes-goo.txt > goo_light.txt
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
