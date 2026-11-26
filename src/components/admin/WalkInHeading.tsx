"use client";

export function WalkInHeading({
  slots,
  time,
  onTime,
  onSeat,
}: {
  slots: string[];
  time: string;
  onTime: (time: string) => void;
  onSeat: (time: string) => void;
}) {
  return (
    <form
      className="diary-walkin-head"
      onSubmit={(e) => {
        e.preventDefault();
        onSeat(time);
      }}
    >
      <strong>Walk-in</strong>
      <label>
        <span>Time</span>
        <select value={time} onChange={(e) => onTime(e.target.value)} required>
          {!slots.length ? <option value="">No times</option> : null}
          {slots.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={!time}>
        Seat
      </button>
    </form>
  );
}
