1. brew install callumreid/cowboat/cowboat  (no malware or your money back!)
2. update your shell with some aliases that 10x efficiency and merriment
```
# Cowboat Git Aliases with Celebrations! :cow2::boat:
# Remove any existing gp/gpf aliases first
unalias gp 2>/dev/null || true
unalias gpf 2>/dev/null || true
# Dynamic git push with random cowboat celebration!
gp() {
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    echo ":rocket: Pushing to branch: $current_branch"
    if git push origin "$current_branch"; then
        echo ":white_check_mark: Push successful! Celebrating with cowboat..."
        # Random boat types (more robust method)
        local boat_num=$((RANDOM % 8))
        case $boat_num in
            0) local random_boat="raft" ;;
            1) local random_boat="ship" ;;
            2) local random_boat="yacht" ;;
            3) local random_boat="canoe" ;;
            4) local random_boat="submarine" ;;
            5) local random_boat="ferry" ;;
            6) local random_boat="pirate" ;;
            7) local random_boat="cruise" ;;
        esac
        # Random number of cows (1-5)
        local random_cows=$((RANDOM % 5 + 1))
        # Random speed (0.02 to 0.12)
        local random_speed=$(echo "scale=2; (($RANDOM % 11) + 2) / 100" | bc)
        echo ":tada: Sailing away with $random_cows cow(s) on a $random_boat at speed $random_speed!"
        cowboat -b "$random_boat" -n "$random_cows" -s "$random_speed"
    else
        echo ":x: Push failed! No cowboat for you this time."
    fi
}
# Force push with EXTRA dramatic cowboat celebration! :boom:
gpf() {
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    echo ":boom: FORCE PUSHING to branch: $current_branch"
    echo ":warning:  This will overwrite remote history!"
    if git push origin "$current_branch" --force; then
        echo ":fire: FORCE PUSH SUCCESSFUL! Epic celebration time..."
        # Force push gets more dramatic boats and settings
        local dramatic_boat_num=$((RANDOM % 4))
        case $dramatic_boat_num in
            0) local random_boat="pirate" ;;
            1) local random_boat="cruise" ;;
            2) local random_boat="ship" ;;
            3) local random_boat="yacht" ;;
        esac
        # More cows for dramatic effect (3-5)
        local random_cows=$((RANDOM % 3 + 3))
        # Faster speed for more drama (0.02 to 0.06)
        local random_speed=$(echo "scale=2; (($RANDOM % 5) + 2) / 100" | bc)
        echo ":boom: FORCE SAILING with $random_cows cow(s) on a $random_boat at speed $random_speed!"
        cowboat -b "$random_boat" -n "$random_cows" -s "$random_speed"
    else
        echo ":x: Force push failed! The git gods have spoken."
    fi
}
```
3. don forget to `source ~/.zshrc` (or w/e you shelling with)
4. make random changes to any repo,then
	- ga
	- gc
	- gp