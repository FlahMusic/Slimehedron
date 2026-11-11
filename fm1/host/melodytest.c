/* Host test of the FM-1 core's melody against the web's own notes: vst/slimehedron-core/src/tank/melody_golden.txt
 * (written by _dev/dev-vstmelody.js from index.html). Each set is four lines: "scale NAME root R", "strong 1 0 ...",
 * "degs ...", "rand ...". The web's random numbers are fed back in order; every note must match, and every random
 * number must be used, no more, no fewer. Prints PASS/FAIL lines; exit 1 on a mismatch.
 *   melodytest GOLDEN */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../core/melody.h"

#define MAXN 4096
typedef struct { double v[MAXN]; int n, i, over; } stream;
static double next(void *c) { stream *s = c; if (s->i >= s->n) { s->over = 1; return 0.5; } return s->v[s->i++]; }

static int read_ints(char *line, int *out) { int n = 0; char *t = strtok(line, " \r\n"); t = strtok(NULL, " \r\n");
  while (t && n < MAXN) { out[n++] = atoi(t); t = strtok(NULL, " \r\n"); } return n; }

int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "melodytest GOLDEN\n"); return 2; }
  FILE *f = fopen(argv[1], "r"); if (!f) { perror(argv[1]); return 2; }
  static char head[256], ls[65536], ld[65536], lr[262144];
  static int strong[MAXN], degs[MAXN]; static stream S;
  int sets = 0, bad = 0, notes = 0;
  while (fgets(head, sizeof head, f) && fgets(ls, sizeof ls, f) && fgets(ld, sizeof ld, f) && fgets(lr, sizeof lr, f)) {
    char scale[64]; int root;
    if (sscanf(head, "scale %63s root %d", scale, &root) != 2) { fprintf(stderr, "bad header: %s", head); return 2; }
    int n = !strcmp(scale, "major") ? 7 : !strcmp(scale, "pentaMaj") ? 5 : 0; if (!n) { fprintf(stderr, "unknown scale %s\n", scale); return 2; }
    int ns = read_ints(ls, strong), nd = read_ints(ld, degs);
    S.n = 0; S.i = 0; S.over = 0; { char *t = strtok(lr, " \r\n"); t = strtok(NULL, " \r\n"); while (t && S.n < MAXN) { S.v[S.n++] = atof(t); t = strtok(NULL, " \r\n"); } }
    sh_melody m; sh_melody_init(&m); int first = -1, got = 0, want = 0;
    for (int i = 0; i < nd && i < ns; i++) { int g = sh_melody_next(&m, strong[i], n, root, next, &S); notes++;
      if (g != degs[i] && first < 0) { first = i; got = g; want = degs[i]; } }
    int ok = first < 0 && !S.over && S.i == S.n; sets++; if (!ok) bad++;
    head[strcspn(head, "\r\n")] = 0;
    if (ok) printf("  PASS  %s: %d notes, note for note, %d random numbers used\n", head, nd, S.i);
    else printf("  FAIL  %s: %s\n", head, first >= 0 ? "a different note" : (S.over ? "asked for more random numbers than the web" : "used fewer random numbers"));
    if (first >= 0) printf("        note %d is degree %d, the web sang %d\n", first, got, want);
  }
  fclose(f);
  printf("%s %d sets, %d notes\n", bad ? "FAILED:" : "the FM-1 core sings the web's melody note for note:", sets, notes);
  return bad || !sets;
}
