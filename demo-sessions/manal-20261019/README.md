# Manal’s October 19 synthetic session

These two files preserve the session added in commit `4a9a854`: six connected model assessments and two human routing decisions. They are historical fixtures produced with `madar-cross-journey-rf-20261017-v1`, before the contributor-sequence correction.

Runtime records now stay in the ignored `.madar-data/` folder. Existing local files were retained; a fresh clone starts with an empty session. Do not copy these fixtures over an active session.

To inspect the historical session, copy both JSON files to a new, empty directory and start Madar with `ASSESSMENT_DATA_DIR` set to that directory. The connected view labels older model assessments. Reassessing supplied evidence uses the current model and retains historical reviews; those old reviews remain attached to their original assessment IDs.

This session contains synthetic decisions, not verified fraud, payment intervention or an operational approval.
