module.exports = {
  test: {
    // Tests share data/ directory — run sequentially to avoid flakiness
    sequence: {
      concurrent: false,
    },
  },
};
